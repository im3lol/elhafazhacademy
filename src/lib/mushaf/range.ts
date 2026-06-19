// منطق اختيار نطاق الآيات على المصحف (دالّتان نقيّتان قابلتان للاختبار بلا واجهة).

export type RangeNums = {
  surahNumber: number | null;
  ayahFrom: number | null;
  ayahTo: number | null;
};

/**
 * يحسب النطاق الجديد عند الضغط على آية.
 * step=0 → الضغطة تبدأ نطاقاً جديداً (from=to=ayah، الخطوة التالية 1).
 * step=1 → الضغطة تضبط الطرف الآخر بترتيب تصاعدي (الخطوة التالية 0).
 * تبديل السورة أو غياب البداية يبدأ نطاقاً جديداً دائماً.
 */
export function computeRange(
  v: RangeNums,
  surah: number,
  ayah: number,
  step: 0 | 1,
): RangeNums & { step: 0 | 1 } {
  if (step === 0 || v.surahNumber !== surah || v.ayahFrom == null) {
    return { surahNumber: surah, ayahFrom: ayah, ayahTo: ayah, step: 1 };
  }
  return {
    surahNumber: surah,
    ayahFrom: Math.min(v.ayahFrom, ayah),
    ayahTo: Math.max(v.ayahFrom, ayah),
    step: 0,
  };
}

/** هل الآية (surah:ayah) داخل النطاق المحدّد؟ */
export function inRange(v: RangeNums, surah: number, ayah: number): boolean {
  return (
    v.surahNumber === surah &&
    v.ayahFrom != null &&
    v.ayahTo != null &&
    ayah >= v.ayahFrom &&
    ayah <= v.ayahTo
  );
}
