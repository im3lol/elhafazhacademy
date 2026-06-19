import { sql } from "@/lib/db";
import { TOTAL_PAGES, type JuzNav, type SurahNav } from "@/lib/mushaf/data";

export type MushafNav = { surahNav: SurahNav[]; juzNav: JuzNav[]; totalPages: number };

// نص المصحف وتخطيطه ثابتان تماماً، فنحمّل بيانات التنقّل مرّة واحدة لكل عملية خادم
// (تجنّب مسح quran_ayahs بـ group by في كل تحميل صفحة).
let cached: Promise<MushafNav> | null = null;

async function load(): Promise<MushafNav> {
  const [surahNav, juzNav, [{ max_page }]] = await Promise.all([
    sql<SurahNav[]>`
      select number, name_ar, min(a.page_number) as start_page
      from quran_surahs s join quran_ayahs a on a.surah_number = s.number
      group by s.number, s.name_ar order by s.number`,
    sql<JuzNav[]>`
      select juz_number as juz, min(page_number) as start_page
      from quran_ayahs where juz_number is not null group by juz_number order by juz_number`,
    sql<{ max_page: number | null }[]>`select max(page_number) as max_page from quran_ayahs`,
  ]);
  return { surahNav, juzNav, totalPages: Number(max_page ?? TOTAL_PAGES) };
}

/** بيانات تنقّل المصحف (السور/الأجزاء/عدد الصفحات) — مكاشة في الذاكرة لثباتها. */
export function getMushafNav(): Promise<MushafNav> {
  if (!cached) cached = load().catch((e) => { cached = null; throw e; });
  return cached;
}
