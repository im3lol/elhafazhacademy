// يجلب نص القرآن العثماني كاملاً مرة واحدة من alquran.cloud ويحفظه seed محلياً.
// التشغيل: node scripts/fetch-quran.mjs   (يحتاج إنترنت مرة واحدة فقط)
// المخرجات: db/seed/quran.json (يُضمَّن في المستودع ويُحمَّل لاحقاً عبر seed-quran.mjs)
import { mkdirSync, writeFileSync } from "node:fs";

const URL = "https://api.alquran.cloud/v1/quran/quran-uthmani";

const res = await fetch(URL);
if (!res.ok) {
  console.error("❌ تعذّر جلب القرآن:", res.status, res.statusText);
  process.exit(1);
}
const json = await res.json();
if (json.code !== 200 || !json.data?.surahs) {
  console.error("❌ استجابة غير متوقعة من المصدر");
  process.exit(1);
}

const surahs = [];
const ayahs = [];
for (const s of json.data.surahs) {
  surahs.push({
    number: s.number,
    name_ar: s.name,
    name_en: s.englishName,
    ayah_count: s.numberOfAyahs ?? s.ayahs.length,
    revelation: s.revelationType, // Meccan | Medinan
  });
  for (const a of s.ayahs) {
    ayahs.push({
      s: s.number,
      a: a.numberInSurah,
      juz: a.juz,
      page: a.page,
      text: a.text,
    });
  }
}

mkdirSync("db/seed", { recursive: true });
const out = "db/seed/quran.json";
writeFileSync(out, JSON.stringify({ surahs, ayahs }));
console.log(`✅ حُفظ ${out} — ${surahs.length} سورة، ${ayahs.length} آية`);
