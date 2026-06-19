import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { TOTAL_PAGES, type PageWord, type SurahHeader } from "@/lib/mushaf/data";

export const dynamic = "force-dynamic";

/** يُرجع كلمات صفحة مصحفية بتخطيط الأسطر (لمستخدم مسجَّل) — يستخدمها عارض المصحف. */
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const u = await getSessionUser();
  if (!u) return Response.json({ error: "unauthorized" }, { status: 401 });

  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PAGES) {
    return Response.json({ error: "invalid page" }, { status: 400 });
  }

  const [words, headers] = await Promise.all([
    sql<PageWord[]>`
      select line_number as line, surah_number as surah, ayah_number as ayah, position as pos,
             is_end as end, text, code_v2 as code, v2_page as vpage
      from quran_words where page_number = ${n} order by seq`,
    sql<SurahHeader[]>`
      select w.surah_number as surah, s.name_ar, min(w.line_number) as first_line
      from quran_words w join quran_surahs s on s.number = w.surah_number
      where w.page_number = ${n} and w.ayah_number = 1
      group by w.surah_number, s.name_ar order by w.surah_number`,
  ]);

  // الجزء: من آية أوّل كلمة على الصفحة
  let juz: number | null = null;
  if (words[0]) {
    const [a] = await sql<{ juz_number: number | null }[]>`
      select juz_number from quran_ayahs where surah_number = ${words[0].surah} and ayah_number = ${words[0].ayah} limit 1`;
    juz = a?.juz_number ?? null;
  }

  return Response.json({ page: n, juz, words, surahHeaders: headers });
}
