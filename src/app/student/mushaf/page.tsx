import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { MushafViewer } from "@/components/mushaf/mushaf-viewer";
import {
  type Bookmark,
  type MushafMistake,
  type MushafProgress,
  type Reciter,
} from "@/lib/mushaf/data";
import { getMushafNav } from "@/lib/mushaf/nav";

export default async function StudentMushafPage() {
  const user = await getSessionUser();
  if (!user || user.userType !== "student") redirect("/login");

  const [student] = await sql<{ id: string; full_name: string }[]>`
    select id, full_name from students where user_id = ${user.id} limit 1`;
  if (!student) redirect("/student/dashboard");

  const [reciters, { surahNav, juzNav, totalPages }, progressRows, mistakes, bookmarks] = await Promise.all([
    sql<Reciter[]>`select id, name_ar, name_en, source from reciters where is_active order by created_at`,
    getMushafNav(),
    sql<NonNullable<MushafProgress>[]>`
      select surah_number, ayah_number, word_index, page_number, updated_at
      from student_mushaf_progress where student_id = ${student.id} limit 1`,
    sql<MushafMistake[]>`
      select id, surah_number, ayah_number, word_index, mistake_type, title, note, is_resolved, created_at
      from student_mushaf_mistakes where student_id = ${student.id} order by created_at desc`,
    sql<Bookmark[]>`
      select page_number, label from student_mushaf_bookmarks
      where student_id = ${student.id} order by page_number`,
  ]);

  const progress = progressRows[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">المصحف الشخصي</h1>
        <p className="mt-1 text-muted">راجع بنفسك من آخر موضع، وتابع ملاحظات معلمك على الآيات.</p>
      </div>

      {surahNav.length === 0 ? (
        <Card className="text-sm text-muted">لم تُحمَّل بيانات المصحف بعد. تواصل مع الإدارة.</Card>
      ) : reciters.length === 0 ? (
        <Card className="text-sm text-muted">لا يوجد قرّاء مفعّلون حالياً.</Card>
      ) : (
        <MushafViewer
          reciters={reciters}
          surahNav={surahNav}
          juzNav={juzNav}
          progress={progress}
          mistakes={mistakes}
          bookmarks={bookmarks}
          initialPage={progress?.page_number ?? 1}
          totalPages={totalPages}
        />
      )}
    </div>
  );
}
