import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { TOTAL_PAGES, type PageWord, type SurahHeader } from "@/lib/mushaf/data";

export const dynamic = "force-dynamic";

type PageData = { page: number; juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };

/**
 * ذاكرة داخل العملية: نصّ المصحف وتخطيطه لا يتغيّران، فلا معنى لإعادة جلبهما
 * من القاعدة البعيدة عند كل تصفّح صفحة. ٦٠٤ صفحة سقفٌ معروف ومحدود.
 */
const pageCache = new Map<number, PageData>();

async function loadPage(n: number): Promise<PageData> {
  const cached = pageCache.get(n);
  if (cached) return cached;

  const [words, headers] = await Promise.all([
    // الجزء يأتي مع الكلمات في نفس الرحلة بدل استعلام ثالث بعدها
    sql<(PageWord & { juz: number | null })[]>`
      select w.line_number as line, w.surah_number as surah, w.ayah_number as ayah, w.position as pos,
             w.is_end as end, w.text, w.code_v2 as code, w.v2_page as vpage, a.juz_number as juz
      from quran_words w
      left join quran_ayahs a on a.surah_number = w.surah_number and a.ayah_number = w.ayah_number
      where w.page_number = ${n} order by w.seq`,
    sql<SurahHeader[]>`
      select w.surah_number as surah, s.name_ar, min(w.line_number) as first_line
      from quran_words w join quran_surahs s on s.number = w.surah_number
      where w.page_number = ${n} and w.ayah_number = 1
      group by w.surah_number, s.name_ar order by w.surah_number`,
  ]);

  const data: PageData = {
    page: n,
    juz: words[0]?.juz ?? null,
    words: words.map(({ juz: _juz, ...w }) => w),
    surahHeaders: headers,
  };
  // لا تُخزَّن صفحة فارغة (قاعدة لم تُبذَر بعد) كي لا تُثبَّت النتيجة الخاطئة
  if (data.words.length > 0) pageCache.set(n, data);
  return data;
}

/** يُرجع كلمات صفحة مصحفية بتخطيط الأسطر (لمستخدم مسجَّل) — يستخدمها عارض المصحف. */
export async function GET(_req: Request, { params }: { params: Promise<{ n: string }> }) {
  const u = await getSessionUser();
  if (!u) return Response.json({ error: "unauthorized" }, { status: 401 });

  const n = Number((await params).n);
  if (!Number.isInteger(n) || n < 1 || n > TOTAL_PAGES) {
    return Response.json({ error: "invalid page" }, { status: 400 });
  }

  return Response.json(await loadPage(n), {
    // خاص بالمستخدم (المسار محمي)، لكن المحتوى ثابت — يُعاد استخدامه من ذاكرة المتصفح
    headers: { "Cache-Control": "private, max-age=86400, immutable" },
  });
}
