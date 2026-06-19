import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { ProgressOverview, type ProgressReport } from "@/components/student/progress-overview";
import { LessonsTable } from "@/components/student/lessons-table";

const catLabel: Record<string, string> = {
  memorization: "حفظ",
  tajweed: "تجويد",
  pronunciation: "نطق",
};
const sevLabel: Record<string, { label: string; cls: string }> = {
  low: { label: "منخفض", cls: "bg-info/15 text-info" },
  medium: { label: "متوسط", cls: "bg-warning/15 text-warning" },
  high: { label: "عالٍ", cls: "bg-danger/15 text-danger" },
};
const mistakeStatus: Record<string, string> = {
  new: "جديد",
  repeated: "متكرر",
  improving: "يتحسّن",
  resolved: "تم تجاوزه",
};

function ar(n: number | null) {
  return n == null ? "—" : n.toLocaleString("ar-EG");
}

type Student = { id: string; full_name: string; current_level: string | null; memorized_parts: string | null; country: string | null };
type Report = ProgressReport & {
  id: string;
  lesson_type: string | null;
  surah_name: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  teacher_notes: string | null;
  homework: string | null;
};
type Mistake = {
  id: string;
  mistake_category: string;
  mistake_type: string;
  surah_name: string | null;
  ayah_number: number | null;
  severity: string;
  status: string;
};
type MistakeSummary = { open: string; resolved: string; repeated: string };

export default async function TeacherStudentDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.userType !== "teacher") redirect("/login");

  // التحقق أن الطالب من طلاب هذا المعلم
  const [student] = await sql<Student[]>`
    select s.id, s.full_name, s.current_level, s.memorized_parts, s.country
    from students s
    join teachers t on t.id = s.teacher_id
    where s.id = ${id} and t.user_id = ${user.id}
    limit 1`;
  if (!student) notFound();

  const [reports, [ms], mistakes, [mushaf]] = await Promise.all([
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
    sql<Mistake[]>`
      select id, mistake_category, mistake_type, surah_name, ayah_number, severity, status
      from student_mistakes where student_id = ${id} order by created_at desc limit 12`,
    sql<{ page_number: number | null; open_notes: number }[]>`
      select
        (select page_number from student_mushaf_progress where student_id = ${id}) as page_number,
        (select count(*)::int from student_mushaf_mistakes where student_id = ${id} and not is_resolved) as open_notes`,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">{student.full_name}</h1>
          <p className="mt-1 text-muted">
            تقدّم الطالب{student.country ? ` · ${student.country}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/teacher/students/${id}/progress`} className={buttonClasses({ size: "sm", variant: "outline" })}>
            التقدّم
          </Link>
          <Link href={`/teacher/students/${id}/mushaf`} className={buttonClasses({ size: "sm" })}>
            المصحف الشخصي
          </Link>
          <Link href="/teacher/students" className={buttonClasses({ size: "sm", variant: "outline" })}>
            → كل الطلاب
          </Link>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-brand/20 bg-brand-subtle/40">
        <div>
          <p className="font-display text-lg font-bold text-brand">المصحف الشخصي</p>
          <p className="mt-1 text-sm text-muted">
            {mushaf?.page_number
              ? `آخر موضع: صفحة ${ar(Number(mushaf.page_number))}`
              : "لم يُحدَّد آخر موضع بعد"}
            {Number(mushaf?.open_notes ?? 0) > 0 && ` · ${ar(Number(mushaf!.open_notes))} ملاحظة مفتوحة`}
          </p>
        </div>
        <Link href={`/teacher/students/${id}/mushaf`} className={buttonClasses({ size: "sm" })}>
          فتح المصحف وتسجيل الملاحظات
        </Link>
      </Card>

      {reports.length === 0 ? (
        <Card className="text-sm text-muted">لا توجد تقارير حصص لهذا الطالب بعد.</Card>
      ) : (
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

      {mistakes.length > 0 && (
        <div>
          <h2 className="mb-3 font-display text-xl font-bold">آخر الأخطاء</h2>
          <div className="space-y-2">
            {mistakes.map((m) => {
              const sev = sevLabel[m.severity] ?? { label: m.severity, cls: "" };
              return (
                <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm">
                    <span className="text-muted">{catLabel[m.mistake_category] ?? m.mistake_category}: </span>
                    {m.mistake_type}
                    {m.surah_name ? ` — ${m.surah_name}` : ""}
                    {m.ayah_number ? ` (${ar(m.ayah_number)})` : ""}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sev.cls}`}>{sev.label}</span>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">
                      {mistakeStatus[m.status] ?? m.status}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {reports.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-bold">سجل الحصص</h2>
          <LessonsTable reports={reports} />
        </div>
      )}
    </div>
  );
}
