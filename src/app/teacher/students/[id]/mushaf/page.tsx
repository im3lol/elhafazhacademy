import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { buttonClasses } from "@/components/ui/button";
import { MushafPicker } from "@/components/mushaf/mushaf-picker";
import { MushafMistakesList } from "@/components/mushaf/mushaf-manager";
import { type MushafMistake, type MushafProgress } from "@/lib/mushaf/data";
import { getMushafNav } from "@/lib/mushaf/nav";

type Student = { id: string; full_name: string };

export default async function TeacherStudentMushafPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.userType !== "teacher") redirect("/login");

  const [student] = await sql<Student[]>`
    select s.id, s.full_name from students s
    join teachers t on t.id = s.teacher_id
    where s.id = ${id} and t.user_id = ${user.id} limit 1`;
  if (!student) notFound();

  const [{ surahNav, juzNav, totalPages }, progressRows, mistakes] = await Promise.all([
    getMushafNav(),
    sql<NonNullable<MushafProgress>[]>`
      select surah_number, ayah_number, word_index, page_number, updated_at
      from student_mushaf_progress where student_id = ${id} limit 1`,
    sql<MushafMistake[]>`
      select id, surah_number, ayah_number, word_index, mistake_type, title, note, is_resolved, created_at
      from student_mushaf_mistakes where student_id = ${id} order by is_resolved, created_at desc`,
  ]);

  const progress = progressRows[0] ?? null;
  const surahNames = surahNav.map((s) => ({ number: s.number, name_ar: s.name_ar }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">مصحف {student.full_name}</h1>
          <p className="mt-1 text-muted">اضغط على كلمة أو آية في المصحف لتعيين آخر موضع أو تسجيل خطأ هناك مباشرةً.</p>
        </div>
        <Link href={`/teacher/students/${id}`} className={buttonClasses({ size: "sm", variant: "outline" })}>
          → ملف الطالب
        </Link>
      </div>

      <MushafPicker
        studentId={id}
        surahNav={surahNav}
        juzNav={juzNav}
        progress={progress}
        mistakes={mistakes}
        initialPage={progress?.page_number ?? 1}
        totalPages={totalPages}
      />

      <MushafMistakesList surahs={surahNames} mistakes={mistakes} />
    </div>
  );
}
