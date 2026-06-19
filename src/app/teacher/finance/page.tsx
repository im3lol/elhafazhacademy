import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { formatClassTime } from "@/lib/class-status";
import { EarningsTable, type EarningRow } from "@/components/teacher/earnings-table";

type Sum = { pending: string | null; approved: string | null; paid: string | null };
type Payout = { id: string; amount: string; created_at: string; status: string };

function egp(v: string | null | number) {
  return `${Number(v ?? 0).toLocaleString("ar-EG")} ج.م`;
}

export default async function TeacherFinancePage() {
  const user = await getSessionUser();
  const [teacher] = await sql<{ id: string }[]>`select id from teachers where user_id = ${user!.id} limit 1`;

  if (!teacher) {
    return <Card className="text-sm text-muted">لا يوجد ملف معلم.</Card>;
  }

  const [[sum], earnings, payouts] = await Promise.all([
    sql<Sum[]>`
      select
        coalesce(sum(amount) filter (where status='pending'),0) as pending,
        coalesce(sum(amount) filter (where status='approved'),0) as approved,
        coalesce(sum(amount) filter (where status='paid'),0) as paid
      from teacher_earnings where teacher_id = ${teacher.id}`,
    sql<EarningRow[]>`
      select e.id, e.amount, e.status, e.created_at, s.full_name as student_name
      from teacher_earnings e
      left join classes c on c.id = e.class_id
      left join students s on s.id = c.student_id
      where e.teacher_id = ${teacher.id}
      order by e.created_at desc`,
    sql<Payout[]>`
      select id, amount, created_at, status from teacher_payouts
      where teacher_id = ${teacher.id} order by created_at desc limit 20`,
  ]);

  const total = Number(sum?.pending ?? 0) + Number(sum?.approved ?? 0) + Number(sum?.paid ?? 0);
  const cards = [
    { label: "قيد المراجعة", value: egp(sum?.pending) },
    { label: "معتمد (مستحق)", value: egp(sum?.approved), accent: true },
    { label: "مدفوع", value: egp(sum?.paid) },
    { label: "إجمالي الأرباح", value: egp(total) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الرصيد والمستحقات</h1>
        <p className="mt-1 text-muted">مستحقاتك عن الحصص المكتملة.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <p className="text-sm text-muted">{c.label}</p>
            <p className={`mt-1 font-display text-2xl font-black ${c.accent ? "text-brand" : ""}`}>{c.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">سجل المستحقات</h2>
        {earnings.length === 0 ? (
          <Card className="text-sm text-muted">لا مستحقات بعد.</Card>
        ) : (
          <EarningsTable earnings={earnings} />
        )}
      </div>

      {payouts.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-bold">المدفوعات</h2>
          <div className="space-y-2">
            {payouts.map((p) => (
              <Card key={p.id} className="flex items-center justify-between">
                <span className="font-bold text-success">{egp(p.amount)}</span>
                <span className="text-sm text-muted" dir="rtl">{formatClassTime(p.created_at)}</span>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
