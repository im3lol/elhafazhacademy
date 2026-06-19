import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { ProgressOverview } from "@/components/student/progress-overview";
import { LessonsTable } from "@/components/student/lessons-table";

type Report = {
  id: string;
  created_at: string;
  lesson_type: string | null;
  surah_name: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  memorization_score: number | null;
  tajweed_score: number | null;
  fluency_score: number | null;
  commitment_score: number | null;
  overall_score: number | null;
  teacher_notes: string | null;
  homework: string | null;
};

type StudentInfo = { id: string; memorized_parts: string | null; current_level: string | null };
type MistakeSummary = { open: string; resolved: string; repeated: string };

export default async function StudentLessonsPage() {
  const user = await getSessionUser();
  const [reports, [info], [ms]] = await Promise.all([
    sql<Report[]>`
      select r.id, r.created_at, r.lesson_type, r.surah_name, r.ayah_from, r.ayah_to,
             r.memorization_score, r.tajweed_score, r.fluency_score, r.commitment_score,
             r.overall_score, r.teacher_notes, r.homework
      from lesson_reports r
      join students s on s.id = r.student_id
      where s.user_id = ${user!.id}
      order by r.created_at desc`,
    sql<StudentInfo[]>`
      select id, memorized_parts, current_level from students where user_id = ${user!.id} limit 1`,
    sql<MistakeSummary[]>`
      select
        count(*) filter (where m.status <> 'resolved')::int as open,
        count(*) filter (where m.status = 'resolved')::int as resolved,
        count(*) filter (where m.status = 'repeated')::int as repeated
      from student_mistakes m
      join students s on s.id = m.student_id
      where s.user_id = ${user!.id}`,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الدروس والتقدم</h1>
        <p className="mt-1 text-muted">سجل حصصك وتقييماتك.</p>
      </div>

      {reports.length === 0 ? (
        <Card className="text-sm text-muted">لا توجد تقارير حصص بعد.</Card>
      ) : (
        <ProgressOverview
          reports={[...reports].reverse()}
          memorizedParts={Number(info?.memorized_parts ?? 0)}
          currentLevel={info?.current_level ?? null}
          mistakes={{
            open: Number(ms?.open ?? 0),
            resolved: Number(ms?.resolved ?? 0),
            repeated: Number(ms?.repeated ?? 0),
          }}
        />
      )}

      {reports.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold">سجل الحصص</h2>
            <span className="text-sm text-muted">اضغط على الحصة لعرض الملاحظات والواجب</span>
          </div>
          <LessonsTable reports={reports} />
        </div>
      )}
    </div>
  );
}
