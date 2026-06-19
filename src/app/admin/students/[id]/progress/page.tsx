import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { buttonClasses } from "@/components/ui/button";
import { getStudentProgress } from "@/lib/student/progress";
import { StudentProgressView } from "@/components/student/student-progress-view";

export default async function AdminStudentProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [student] = await sql<{ id: string; full_name: string; memorized_parts: string | null; current_level: string | null }[]>`
    select id, full_name, memorized_parts, current_level from students where id = ${id} limit 1`;
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
        <Link href={`/admin/students/${id}`} className={buttonClasses({ size: "sm", variant: "outline" })}>
          → ملف الطالب
        </Link>
      </div>
      <StudentProgressView data={data} studentName={student.full_name} />
    </div>
  );
}
