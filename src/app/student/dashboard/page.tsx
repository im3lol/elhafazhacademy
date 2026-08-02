import Link from "next/link";
import { sql } from "@/lib/db";
import { requireProfile } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { classStatusLabel, classStatusClass, formatClassTime } from "@/lib/class-status";
import { ProgressOverview, type ProgressReport } from "@/components/student/progress-overview";

const statusLabels: Record<string, string> = {
  "Pending Payment": "بانتظار الدفع",
  "Payment Under Review": "الدفع قيد المراجعة",
  Active: "نشط",
  Suspended: "موقوف",
  Cancelled: "ملغى",
  "Payment Rejected": "تم رفض الدفع",
};

type Row = {
  id: string;
  full_name: string;
  status: string;
  current_level: string | null;
  country: string | null;
  memorized_parts: string | null;
  package_name: string | null;
};

export default async function StudentDashboard() {
  const { profileId: studentId } = await requireProfile("student");

  // خمس رحلات متسلسلة كانت تُجمَع هنا؛ لا تعتمد على بعضها فتُنفَّذ معاً
  const [[student], reports, [mistakeSummary], upcoming, [mushaf]] = await Promise.all([
    sql<Row[]>`
      select s.id, s.full_name, s.status, s.current_level, s.country, s.memorized_parts, p.name as package_name
      from students s
      left join packages p on p.id = s.package_id
      where s.id = ${studentId} limit 1`,
    // آخر ٢٤ تقريراً فقط: الرسم البياني لا يعرض أكثر، والجلب غير المحدود ينمو بلا سقف
    sql<ProgressReport[]>`
      select * from (
        select created_at, overall_score, memorization_score, tajweed_score, fluency_score, commitment_score
        from lesson_reports where student_id = ${studentId} order by created_at desc limit 24
      ) r order by created_at asc`,
    sql<{ open: number; resolved: number }[]>`
      select count(*) filter (where not is_resolved)::int as open,
             count(*) filter (where is_resolved)::int as resolved
      from student_mushaf_mistakes where student_id = ${studentId}`,
    sql<{ id: string; start_time: string; status: string; meet_link: string | null; teacher_name: string }[]>`
      select c.id, c.start_time, c.status, c.meet_link, t.full_name as teacher_name
      from classes c join teachers t on t.id = c.teacher_id
      where c.student_id = ${studentId}
        and c.status not in ('completed','cancelled')
        and c.start_time >= now() - interval '1 hour'
      order by c.start_time asc limit 5`,
    sql<{ page_number: number | null; surah_number: number | null; ayah_number: number | null; open_notes: number }[]>`
      select p.page_number, p.surah_number, p.ayah_number,
             (select count(*)::int from student_mushaf_mistakes
               where student_id = ${studentId} and not is_resolved) as open_notes
      from (select 1) one
      left join student_mushaf_progress p on p.student_id = ${studentId}`,
  ]);

  const status = student?.status ?? "Pending Payment";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">
          أهلاً، {student?.full_name ?? "طالبنا العزيز"}
        </h1>
        <p className="mt-1 text-muted">نظرة سريعة على حسابك.</p>
      </div>

      {status !== "Active" && (
        <Card className="border-warning/30 bg-warning/10">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              حالة حسابك: <span className="font-bold">{statusLabels[status] ?? status}</span>.
              {status === "Pending Payment" && " يرجى رفع إثبات الدفع لتفعيل الحساب."}
            </p>
            {status === "Pending Payment" && (
              <Link href="/student/payment" className={buttonClasses({ size: "sm" })}>
                رفع إثبات الدفع
              </Link>
            )}
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-sm text-muted">الباقة</p>
          <p className="mt-1 font-display text-xl font-bold">{student?.package_name ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">مستوى الحفظ</p>
          <p className="mt-1 font-display text-xl font-bold">{student?.current_level ?? "—"}</p>
        </Card>
        <Card>
          <p className="text-sm text-muted">الدولة</p>
          <p className="mt-1 font-display text-xl font-bold">{student?.country ?? "—"}</p>
        </Card>
      </div>

      {student && (
        <Card className="flex flex-wrap items-center justify-between gap-3 border-brand/20 bg-brand-subtle/40">
          <div>
            <p className="font-display text-lg font-bold text-brand">المصحف الشخصي</p>
            <p className="mt-1 text-sm text-muted">
              {mushaf?.page_number
                ? `تابع المراجعة من آخر موضع — صفحة ${Number(mushaf.page_number).toLocaleString("ar-EG")}`
                : "ابدأ مراجعتك الذاتية في المصحف"}
              {Number(mushaf?.open_notes ?? 0) > 0 &&
                ` · ${Number(mushaf!.open_notes).toLocaleString("ar-EG")} ملاحظة بحاجة لمراجعة`}
            </p>
          </div>
          <Link href="/student/mushaf" className={buttonClasses({ size: "sm" })}>
            {mushaf?.page_number ? "تابع المراجعة" : "افتح المصحف"}
          </Link>
        </Card>
      )}

      {reports.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-bold">تحليلات تقدّمك</h2>
          <ProgressOverview
            reports={reports}
            memorizedParts={Number(student?.memorized_parts ?? 0)}
            currentLevel={student?.current_level ?? null}
            mistakes={{
              open: Number(mistakeSummary?.open ?? 0),
              resolved: Number(mistakeSummary?.resolved ?? 0),
              repeated: 0,
            }}
          />
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">الحصص القادمة</h2>
        {upcoming.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد حصص مجدولة حالياً.</Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">مع المعلم {c.teacher_name}</p>
                  <p className="text-sm text-muted" dir="rtl">{formatClassTime(c.start_time)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classStatusClass[c.status] ?? ""}`}>
                    {classStatusLabel[c.status] ?? c.status}
                  </span>
                  {c.meet_link && (
                    <a href={`/api/classes/${c.id}/join`} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm" })}>
                      دخول الحصة
                    </a>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
