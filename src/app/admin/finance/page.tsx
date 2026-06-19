import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  calculateEarnings,
  approveTeacherEarnings,
  payoutTeacher,
} from "@/lib/admin/finance-actions";

type Overview = {
  revenue_total: string | null;
  revenue_month: string | null;
  earnings_pending: string | null;
  earnings_approved: string | null;
  earnings_paid: string | null;
};
type TeacherBal = {
  teacher_id: string;
  full_name: string;
  pending: string | null;
  approved: string | null;
  paid: string | null;
};

function egp(v: string | null | number) {
  const n = Number(v ?? 0);
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

export default async function AdminFinancePage() {
  const [[ov], teachers] = await Promise.all([
    sql<Overview[]>`
      select
        (select coalesce(sum(amount),0) from payments where status = 'Payment Approved') as revenue_total,
        (select coalesce(sum(amount),0) from payments where status = 'Payment Approved'
           and created_at >= date_trunc('month', now())) as revenue_month,
        (select coalesce(sum(amount),0) from teacher_earnings where status = 'pending') as earnings_pending,
        (select coalesce(sum(amount),0) from teacher_earnings where status = 'approved') as earnings_approved,
        (select coalesce(sum(amount),0) from teacher_earnings where status = 'paid') as earnings_paid`,
    sql<TeacherBal[]>`
      select t.id as teacher_id, t.full_name,
        coalesce(sum(amount) filter (where e.status = 'pending'), 0) as pending,
        coalesce(sum(amount) filter (where e.status = 'approved'), 0) as approved,
        coalesce(sum(amount) filter (where e.status = 'paid'), 0) as paid
      from teachers t
      join teacher_earnings e on e.teacher_id = t.id
      group by t.id, t.full_name
      order by t.full_name`,
  ]);

  const revenue = Number(ov?.revenue_total ?? 0);
  const paidOut = Number(ov?.earnings_paid ?? 0);
  const netApprox = revenue - paidOut;

  const stats = [
    { label: "إجمالي الإيرادات", value: egp(ov?.revenue_total), accent: true },
    { label: "إيرادات الشهر", value: egp(ov?.revenue_month) },
    { label: "مستحقات معلّقة", value: egp(ov?.earnings_pending) },
    { label: "مستحقات معتمدة", value: egp(ov?.earnings_approved) },
    { label: "مدفوع للمعلمين", value: egp(ov?.earnings_paid) },
    { label: "صافي تقريبي", value: egp(netApprox) },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">المالية</h1>
          <p className="mt-1 text-muted">الإيرادات ومستحقات المعلمين.</p>
        </div>
        <div className="flex items-center gap-2">
          <a href="/api/admin/finance/export" className={buttonClasses({ size: "sm", variant: "outline" })}>
            تصدير CSV
          </a>
          <form action={calculateEarnings}>
            <Button type="submit" size="sm" variant="outline">احتساب المستحقات</Button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-black ${s.accent ? "text-brand" : ""}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">مستحقات المعلمين</h2>
        {teachers.length === 0 ? (
          <Card className="text-sm text-muted">لا مستحقات بعد. اضغط «احتساب المستحقات» بعد إكمال حصص.</Card>
        ) : (
          <div className="space-y-3">
            {teachers.map((t) => {
              const pending = Number(t.pending ?? 0);
              const approved = Number(t.approved ?? 0);
              return (
                <Card key={t.teacher_id} className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold">{t.full_name}</p>
                    <p className="mt-1 text-sm text-muted">
                      معلّق: {egp(t.pending)} · معتمد: {egp(t.approved)} · مدفوع: {egp(t.paid)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {pending > 0 && (
                      <form action={approveTeacherEarnings}>
                        <input type="hidden" name="teacher_id" value={t.teacher_id} />
                        <Button type="submit" size="sm" variant="outline">اعتماد ({egp(t.pending)})</Button>
                      </form>
                    )}
                    {approved > 0 && (
                      <form action={payoutTeacher}>
                        <input type="hidden" name="teacher_id" value={t.teacher_id} />
                        <Button type="submit" size="sm">صرف ({egp(t.approved)})</Button>
                      </form>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
