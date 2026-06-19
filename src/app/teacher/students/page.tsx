import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { StudentsTable, type StudentRow } from "@/components/teacher/students-table";

export default async function TeacherStudentsPage() {
  const user = await getSessionUser();
  const [teacher] = await sql<{ id: string }[]>`select id from teachers where user_id = ${user!.id} limit 1`;

  const students = teacher
    ? await sql<StudentRow[]>`
        select s.id, s.full_name, s.country, s.current_level, s.status, p.name as package_name,
               (select count(*) from classes c where c.student_id = s.id and c.status = 'completed')::int as classes_done,
               (select r.overall_score from lesson_reports r where r.student_id = s.id order by r.created_at desc limit 1) as last_overall
        from students s
        left join packages p on p.id = s.package_id
        where s.teacher_id = ${teacher.id}
        order by s.full_name`
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">طلابي</h1>
        <p className="mt-1 text-muted">{students.length} طالب.</p>
      </div>

      {students.length === 0 ? (
        <Card className="text-sm text-muted">لا يوجد طلاب معيّنون لك بعد. اطلب من «طلاب جدد».</Card>
      ) : (
        <StudentsTable students={students} />
      )}
    </div>
  );
}
