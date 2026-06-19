import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { buttonClasses } from "@/components/ui/button";
import { getStudentProgress } from "@/lib/student/progress";
import { StudentProgressView } from "@/components/student/student-progress-view";

export default async function TeacherStudentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.userType !== "teacher") redirect("/login");

  const [student] = await sql<{ id: string; full_name: string; memorized_parts: string | null; current_level: string | null }[]>`
    select s.id, s.full_name, s.memorized_parts, s.current_level
    from students s join teachers t on t.id = s.teacher_id
    where s.id = ${id} and t.user_id = ${user.id} limit 1`;
  if (!student) notFound();

  const data = await getStudentProgress(student.id, Number(student.memorized_parts ?? 0));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">تقدّم {student.full_name}</h1>
          <p className="mt-1 text-muted">
            رحلة الطالب مع كتاب الله{student.current_level ? ` · المستوى: ${student.current_level}` : ""}.
          </p>
        </div>
        <Link href={`/teacher/students/${id}`} className={buttonClasses({ size: "sm", variant: "outline" })}>
          → ملف الطالب
        </Link>
      </div>
      <StudentProgressView data={data} studentName={student.full_name} />
    </div>
  );
}
