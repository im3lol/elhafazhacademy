import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { AdminStudentMushaf } from "@/components/mushaf/admin-student-mushaf";
import { getMushafNav } from "@/lib/mushaf/nav";
import { type MushafMistake } from "@/lib/mushaf/data";

const ar = (n: number | null | undefined) => Number(n ?? 0).toLocaleString("ar-EG");

export default async function AdminStudentMushafPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [student] = await sql<{ id: string; full_name: string }[]>`
    select id, full_name from students where id = ${id} limit 1`;
  if (!student) notFound();

  const [{ surahNav, juzNav, totalPages }, progressRows, mistakes] = await Promise.all([
    getMushafNav(),
    sql<{ page_number: number | null }[]>`
      select page_number from student_mushaf_progress where student_id = ${id} limit 1`,
    sql<MushafMistake[]>`
      select id, surah_number, ayah_number, word_index, mistake_type, title, note, is_resolved, created_at
      from student_mushaf_mistakes where student_id = ${id} order by is_resolved, created_at desc`,
  ]);

  const initialPage = Number(progressRows[0]?.page_number ?? 1);
  const openCount = mistakes.filter((m) => !m.is_resolved).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">مصحف {student.full_name}</h1>
          <p className="mt-1 text-muted">
            عرض للمتابعة (قراءة فقط){progressRows[0]?.page_number ? ` · آخر موضع: صفحة ${ar(progressRows[0]?.page_number)}` : ""}
            {openCount > 0 ? ` · ${ar(openCount)} ملاحظة مفتوحة` : ""}
          </p>
        </div>
        <Link href={`/admin/students/${id}`} className={buttonClasses({ size: "sm", variant: "outline" })}>
          → ملف الطالب
        </Link>
      </div>

      {surahNav.length === 0 ? (
        <Card className="text-sm text-muted">لم تُحمَّل بيانات المصحف بعد.</Card>
      ) : (
        <AdminStudentMushaf
          surahNav={surahNav}
          juzNav={juzNav}
          totalPages={totalPages}
          initialPage={initialPage}
          mistakes={mistakes}
        />
      )}
    </div>
  );
}
