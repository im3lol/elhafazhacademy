import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getStudentProgress } from "@/lib/student/progress";
import { StudentProgressView } from "@/components/student/student-progress-view";

export default async function StudentProgressPage() {
  const user = await getSessionUser();
  if (!user || user.userType !== "student") redirect("/login");

  const [student] = await sql<{ id: string; full_name: string; memorized_parts: string | null; current_level: string | null }[]>`
    select id, full_name, memorized_parts, current_level from students where user_id = ${user.id} limit 1`;
  if (!student) redirect("/student/dashboard");

  const data = await getStudentProgress(student.id, Number(student.memorized_parts ?? 0));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">تقدّمي</h1>
        <p className="mt-1 text-muted">
          رحلتك مع كتاب الله{student.current_level ? ` · المستوى: ${student.current_level}` : ""}.
        </p>
      </div>
      <StudentProgressView data={data} studentName={student.full_name} />
    </div>
  );
}
