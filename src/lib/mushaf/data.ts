// طبقة بيانات المصحف الشخصي: أنواع الأخطاء وألوانها (بهوية الحفظة) وبناء روابط الصوت.

export type MistakeType = "tajweed" | "memorization" | "waqf_ibtida" | "needs_review" | "excellent";

/** أنواع الأخطاء مع تسمياتها وألوان الهوية (نقطة العلامة + لون الدرج). */
export const MISTAKE_TYPES: Record<
  MistakeType,
  { label: string; hint: string; dot: string; soft: string }
> = {
  tajweed: {
    label: "تجويد",
    hint: "أخطاء المد، الغنة، القلقلة، المخارج",
    dot: "bg-danger",
    soft: "bg-danger/15 text-danger",
  },
  memorization: {
    label: "نسيان",
    hint: "نسيان آية أو كلمة",
    dot: "bg-warning",
    soft: "bg-warning/15 text-warning",
  },
  waqf_ibtida: {
    label: "وقف وابتداء",
    hint: "أخطاء الوقف أو بداية القراءة",
    dot: "bg-info",
    soft: "bg-info/15 text-info",
  },
  needs_review: {
    label: "يحتاج مراجعة",
    hint: "موضع يحتاج تكرار ومراجعة",
    dot: "bg-success",
    soft: "bg-success/15 text-success",
  },
  excellent: {
    label: "ممتاز",
    hint: "موضع متقن أو أداء ممتاز",
    dot: "bg-gold",
    soft: "bg-gold/15 text-gold",
  },
};

export const MISTAKE_TYPE_KEYS = Object.keys(MISTAKE_TYPES) as MistakeType[];

export function isMistakeType(v: string): v is MistakeType {
  return v in MISTAKE_TYPES;
}

const pad3 = (n: number) => String(n).padStart(3, "0");

/** يبني رابط تلاوة آية من مجلد القارئ على everyayah.com. */
export function ayahAudioUrl(reciterSource: string, surah: number, ayah: number): string {
  return `https://everyayah.com/data/${reciterSource}/${pad3(surah)}${pad3(ayah)}.mp3`;
}

export type Reciter = { id: string; name_ar: string; name_en: string | null; source: string };
export type SurahMeta = { number: number; name_ar: string; name_en: string | null; ayah_count: number };
export type Ayah = { ayah_number: number; juz_number: number | null; page_number: number | null; text: string };

/** آية على صفحة مصحفية (قد تحوي الصفحة آيات من أكثر من سورة). */
export type PageAyah = {
  surah_number: number;
  surah_name: string;
  ayah_number: number;
  juz_number: number | null;
  text: string;
};

/** كلمة على صفحة مصحفية بتخطيط مصحف المدينة (مع رقم السطر). */
export type PageWord = {
  line: number;
  surah: number;
  ayah: number;
  pos: number;
  end: boolean;
  text: string;
  code: string;   // رمز QCF v2 للعرض المصحفي الدقيق
  vpage: number;  // رقم خط الصفحة في QCF v2
};

/** رابط خط QCF v2 لصفحة — عبر وكيل نفس النطاق (لتفادي حجب CORS على الخطوط). */
export function qcfFontUrl(vpage: number): string {
  return `/api/quran/font/${vpage}`;
}

/** سورة تبدأ على الصفحة (لرسم لافتة الاسم والبسملة قبل سطرها الأول). */
export type SurahHeader = { surah: number; name_ar: string; first_line: number };

export type SurahNav = { number: number; name_ar: string; start_page: number };
export type JuzNav = { juz: number; start_page: number };
export type Bookmark = { page_number: number; label: string | null };

export const TOTAL_PAGES = 604;

/** هل رقم الصفحة ضمن نطاق المصحف الصحيح (١..٦٠٤)؟ */
export function isValidMushafPage(page: unknown): page is number {
  return typeof page === "number" && Number.isInteger(page) && page >= 1 && page <= TOTAL_PAGES;
}

const JUZ_ORDINALS = [
  "الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس", "السابع", "الثامن", "التاسع", "العاشر",
  "الحادي عشر", "الثاني عشر", "الثالث عشر", "الرابع عشر", "الخامس عشر", "السادس عشر", "السابع عشر",
  "الثامن عشر", "التاسع عشر", "العشرون", "الحادي والعشرون", "الثاني والعشرون", "الثالث والعشرون",
  "الرابع والعشرون", "الخامس والعشرون", "السادس والعشرون", "السابع والعشرون", "الثامن والعشرون",
  "التاسع والعشرون", "الثلاثون",
];

/** اسم الجزء العربي: ١ → «الجزء الأول». */
export function juzName(juz: number | null | undefined): string {
  if (!juz || juz < 1 || juz > 30) return "";
  return `الجزء ${JUZ_ORDINALS[juz - 1]}`;
}

/** مواضع بداية كل كلمة كنسبة من زمن الآية (تقدير بطول الكلمات) — لتمييز الكلمة الجارية والقفز إليها. */
export function wordStarts(words: string[]): number[] {
  const lens = words.map((w) => w.length + 1);
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const starts: number[] = [];
  let acc = 0;
  for (const l of lens) {
    starts.push(acc / total);
    acc += l;
  }
  return starts;
}

export type MushafProgress = {
  surah_number: number;
  ayah_number: number;
  word_index: number | null;
  page_number: number | null;
  updated_at: string;
} | null;

export type MushafMistake = {
  id: string;
  surah_number: number;
  ayah_number: number;
  word_index: number | null;
  mistake_type: MistakeType;
  title: string;
  note: string | null;
  is_resolved: boolean;
  created_at: string;
};
