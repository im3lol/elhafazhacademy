import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ProgressOverview, type ProgressReport } from "@/components/student/progress-overview";
import { LessonsTable } from "@/components/student/lessons-table";
import { formatClassTime } from "@/lib/class-status";

const studentStatus: Record<string, { label: string; cls: string }> = {
  "Pending Payment": { label: "بانتظار الدفع", cls: "bg-warning/15 text-warning" },
  "Payment Under Review": { label: "مراجعة الدفع", cls: "bg-info/15 text-info" },
  Active: { label: "نشط", cls: "bg-success/15 text-success" },
  Suspended: { label: "موقوف", cls: "bg-muted/15 text-muted" },
  Cancelled: { label: "ملغى", cls: "bg-muted/15 text-muted" },
  "Payment Rejected": { label: "دفع مرفوض", cls: "bg-danger/15 text-danger" },
};
const paymentStatus: Record<string, { label: string; cls: string }> = {
  "Payment Under Review": { label: "قيد المراجعة", cls: "bg-warning/15 text-warning" },
  "Payment Approved": { label: "مقبول", cls: "bg-success/15 text-success" },
  "Payment Rejected": { label: "مرفوض", cls: "bg-danger/15 text-danger" },
  "Payment Uploaded": { label: "مرفوع", cls: "bg-info/15 text-info" },
  "Pending Payment": { label: "بانتظار الدفع", cls: "bg-muted/15 text-muted" },
};

function ar(n: number | string | null | undefined) {
  return n == null ? "—" : Number(n).toLocaleString("ar-EG");
}
function egp(v: string | number | null | undefined) {
  return `${Number(v ?? 0).toLocaleString("ar-EG")} ج.م`;
}

type Student = {
  id: string;
  full_name: string;
  country: string | null;
  city: string | null;
  phone: string | null;
  whatsapp: string | null;
  current_level: string | null;
  memorized_parts: string | null;
  status: string;
  created_at: string;
  teacher_id: string | null;
  teacher_name: string | null;
  package_name: string | null;
};
type Sub = {
  status: string;
  start_date: string | null;
  end_date: string | null;
  classes_total: number;
  classes_used: number;
  hours_total: string;
  hours_used: string;
};
type Report = ProgressReport & {
  id: string;
  lesson_type: string | null;
  surah_name: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  teacher_notes: string | null;
  homework: string | null;
};
type MistakeSummary = { open: string; resolved: string; repeated: string };
type ClassCounts = { completed: number; upcoming: number; cancelled: number };
type PaymentRow = { id: string; amount: string; currency: string; status: string; created_at: string };
type PaymentSum = { approved: string };

export default async function AdminStudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [student] = await sql<Student[]>`
    select s.id, s.full_name, s.country, s.city, s.phone, s.whatsapp,
           s.current_level, s.memorized_parts, s.status, s.created_at, s.teacher_id,
           t.full_name as teacher_name, p.name as package_name
    from students s
    left join teachers t on t.id = s.teacher_id
    left join packages p on p.id = s.package_id
    where s.id = ${id}
    limit 1`;
  if (!student) notFound();

  const [[sub], reports, [ms], [classes], payments, [paySum], [mushaf]] = await Promise.all([
    sql<Sub[]>`
      select status, start_date, end_date, classes_total, classes_used, hours_total, hours_used
      from student_subscriptions where student_id = ${id}
      order by created_at desc limit 1`,
    sql<Report[]>`
      select id, created_at, lesson_type, surah_name, ayah_from, ayah_to,
             memorization_score, tajweed_score, fluency_score, commitment_score, overall_score,
             teacher_notes, homework
      from lesson_reports where student_id = ${id} order by created_at desc`,
    sql<MistakeSummary[]>`
      select
        count(*) filter (where status <> 'resolved')::int as open,
        count(*) filter (where status = 'resolved')::int as resolved,
        count(*) filter (where status = 'repeated')::int as repeated
      from student_mistakes where student_id = ${id}`,
    sql<ClassCounts[]>`
      select
        count(*) filter (where status = 'completed')::int as completed,
        count(*) filter (where status not in ('completed','cancelled'))::int as upcoming,
        count(*) filter (where status = 'cancelled')::int as cancelled
      from classes where student_id = ${id}`,
    sql<PaymentRow[]>`
      select id, amount, currency, status, created_at
      from payments where student_id = ${id} order by created_at desc limit 10`,
    sql<PaymentSum[]>`
      select coalesce(sum(amount),0) as approved
      from payments where student_id = ${id} and status = 'Payment Approved'`,
    sql<{ page_number: number | null; open_notes: number }[]>`
      select
        (select page_number from student_mushaf_progress where student_id = ${id}) as page_number,
        (select count(*)::int from student_mushaf_mistakes where student_id = ${id} and not is_resolved) as open_notes`,
  ]);

  const st = studentStatus[student.status] ?? { label: student.status, cls: "bg-surface text-muted" };

  const info = [
    { label: "المعلم", value: student.teacher_name ?? "غير معيّن" },
    { label: "الباقة", value: student.package_name ?? "—" },
    { label: "المستوى", value: student.current_level ?? "—" },
    { label: "أجزاء محفوظة", value: ar(student.memorized_parts) },
    { label: "الهاتف", value: student.phone ?? "—" },
    { label: "واتساب", value: student.whatsapp ?? "—" },
    { label: "الدولة / المدينة", value: [student.country, student.city].filter(Boolean).join(" · ") || "—" },
    { label: "تاريخ التسجيل", value: new Date(student.created_at).toLocaleDateString("ar-EG") },
  ];

  const kpis = [
    { label: "حصص مكتملة", value: ar(classes.completed) },
    { label: "حصص قادمة", value: ar(classes.upcoming) },
    { label: "حصص ملغاة", value: ar(classes.cancelled) },
    { label: "إجمالي مدفوع", value: egp(paySum?.approved), accent: true },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="font-display text-3xl font-black">{student.full_name}</h1>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}>{st.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/admin/students/${id}/progress`} className={buttonClasses({ size: "sm", variant: "outline" })}>
            التقدّم
          </Link>
          <Link href="/admin/students" className={buttonClasses({ size: "sm", variant: "outline" })}>
            → كل الطلاب
          </Link>
        </div>
      </div>

      <Card className="grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
        {info.map((f) => (
          <div key={f.label}>
            <p className="text-xs text-muted">{f.label}</p>
            <p className="mt-0.5 font-medium">{f.value}</p>
          </div>
        ))}
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-muted">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-black ${k.accent ? "text-brand" : ""}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {sub && (
        <Card className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-display text-lg font-bold">الاشتراك الحالي</p>
            <span className="text-sm text-muted" dir="rtl">
              {sub.start_date ? new Date(sub.start_date).toLocaleDateString("ar-EG") : "—"}
              {sub.end_date ? ` ← ${new Date(sub.end_date).toLocaleDateString("ar-EG")}` : ""}
            </span>
          </div>
          <p className="text-sm text-muted">
            الحصص: {ar(sub.classes_used)} / {ar(sub.classes_total)}
            {Number(sub.hours_total) > 0 && ` · الساعات: ${ar(sub.hours_used)} / ${ar(sub.hours_total)}`}
          </p>
        </Card>
      )}

      <Card className="flex flex-wrap items-center justify-between gap-3 border-brand/20 bg-brand-subtle/40">
        <div>
          <p className="font-display text-lg font-bold text-brand">المصحف الشخصي</p>
          <p className="mt-1 text-sm text-muted">
            {mushaf?.page_number ? `آخر موضع: صفحة ${ar(mushaf.page_number)}` : "لم يُحدَّد آخر موضع بعد"}
            {Number(mushaf?.open_notes ?? 0) > 0 && ` · ${ar(mushaf!.open_notes)} ملاحظة مفتوحة`}
          </p>
        </div>
        <Link href={`/admin/students/${id}/mushaf`} className={buttonClasses({ size: "sm", variant: "outline" })}>
          فتح مصحف الطالب
        </Link>
      </Card>

      {reports.length > 0 && (
        <ProgressOverview
          reports={[...reports].reverse()}
          memorizedParts={Number(student.memorized_parts ?? 0)}
          currentLevel={student.current_level}
          mistakes={{
            open: Number(ms?.open ?? 0),
            resolved: Number(ms?.resolved ?? 0),
            repeated: Number(ms?.repeated ?? 0),
          }}
        />
      )}

      {payments.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-bold">المدفوعات</h2>
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[460px] text-right text-sm">
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="p-3 font-medium">المبلغ</th>
                  <th className="p-3 font-medium">التاريخ</th>
                  <th className="p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((pay) => {
                  const ps = paymentStatus[pay.status] ?? { label: pay.status, cls: "bg-surface text-muted" };
                  return (
                    <tr key={pay.id} className="border-b border-border/60 last:border-0">
                      <td className="p-3 font-bold tabular-nums text-brand">
                        {ar(pay.amount)} {pay.currency}
                      </td>
                      <td className="whitespace-nowrap p-3 text-muted" dir="rtl">{formatClassTime(pay.created_at)}</td>
                      <td className="p-3">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ps.cls}`}>{ps.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>
        </div>
      )}

      {reports.length > 0 ? (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">سجل الحصص</h2>
          <LessonsTable reports={reports} />
        </div>
      ) : (
        <Card className="text-sm text-muted">لا توجد تقارير حصص لهذا الطالب بعد.</Card>
      )}
    </div>
  );
}
