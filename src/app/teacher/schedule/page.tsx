import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { ClassSchedule, type ScheduleRow } from "@/components/dashboard/class-schedule";

export default async function TeacherSchedulePage() {
  const user = await getSessionUser();
  const [teacher] = await sql<{ id: string }[]>`
    select id from teachers where user_id = ${user!.id} limit 1`;

  const rows = teacher
    ? await sql<ScheduleRow[]>`
        select c.id, c.start_time, c.status, c.meet_link,
               s.full_name as other_name,
               (select lr.overall_score from lesson_reports lr
                  where lr.class_id = c.id order by lr.created_at desc limit 1) as overall_score
        from classes c
        join students s on s.id = c.student_id
        where c.teacher_id = ${teacher.id}
        order by c.start_time desc`
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">جدول الحصص</h1>
        <p className="mt-1 text-muted">كل حصصك القادمة والسابقة مع طلابك.</p>
      </div>

      {!teacher ? (
        <Card className="text-sm text-muted">لا يوجد ملف معلم مرتبط بحسابك.</Card>
      ) : (
        <ClassSchedule rows={rows} role="teacher" />
      )}
    </div>
  );
}
