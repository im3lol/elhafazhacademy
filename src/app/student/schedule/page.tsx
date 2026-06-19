import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { ClassSchedule, type ScheduleRow } from "@/components/dashboard/class-schedule";

export default async function StudentSchedulePage() {
  const user = await getSessionUser();
  const [student] = await sql<{ id: string }[]>`
    select id from students where user_id = ${user!.id} limit 1`;

  const rows = student
    ? await sql<ScheduleRow[]>`
        select c.id, c.start_time, c.status, c.meet_link,
               t.full_name as other_name,
               (select lr.overall_score from lesson_reports lr
                  where lr.class_id = c.id order by lr.created_at desc limit 1) as overall_score
        from classes c
        join teachers t on t.id = c.teacher_id
        where c.student_id = ${student.id}
        order by c.start_time desc`
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">جدول الحصص</h1>
        <p className="mt-1 text-muted">كل حصصك القادمة والسابقة.</p>
      </div>

      {!student ? (
        <Card className="text-sm text-muted">لا يوجد ملف طالب مرتبط بحسابك.</Card>
      ) : (
        <ClassSchedule rows={rows} role="student" />
      )}
    </div>
  );
}
