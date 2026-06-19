import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { MistakesTable, type MistakeRow } from "@/components/student/mistakes-table";

export default async function StudentMistakesPage() {
  const user = await getSessionUser();
  const mistakes = await sql<MistakeRow[]>`
    select m.id, s.name_ar as surah_name, m.surah_number, m.ayah_number, m.word_index,
           m.mistake_type, m.title, m.note, m.is_resolved, qa.text as ayah_text
    from student_mushaf_mistakes m
    join students st on st.id = m.student_id
    join quran_surahs s on s.number = m.surah_number
    left join quran_ayahs qa on qa.surah_number = m.surah_number and qa.ayah_number = m.ayah_number
    where st.user_id = ${user!.id}
    order by m.is_resolved, m.created_at desc`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الأخطاء</h1>
        <p className="mt-1 text-muted">ملاحظات معلمك على تلاوتك — اضغط على أي خطأ لعرض الآية وموضع الخطأ فيها.</p>
      </div>

      {mistakes.length === 0 ? (
        <Card className="text-sm text-muted">لا توجد أخطاء مسجّلة — أحسنت! 🌟</Card>
      ) : (
        <MistakesTable mistakes={mistakes} />
      )}
    </div>
  );
}
