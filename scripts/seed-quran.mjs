// يحمّل نص القرآن من db/seed/quran.json إلى الجداول + يبذر القرّاء (everyayah).
// التشغيل: node scripts/seed-quran.mjs   (لا يحتاج إنترنت)
import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sql = postgres(env.DATABASE_URL, { max: 1 });
const { surahs, ayahs } = JSON.parse(
  readFileSync(new URL("../db/seed/quran.json", import.meta.url), "utf8"),
);

/** يزيل BOM، ويفصل البسملة (أول ٤ كلمات) من الآية ١ لغير الفاتحة — تُعرض كعنوان لا كآية. */
function cleanAyahText(text, surah, ayah) {
  let t = text.replace(/^﻿/, "").trim();
  if (surah !== 1 && ayah === 1) {
    const toks = t.split(/\s+/);
    if (toks.length > 4 && toks[0].startsWith("بِسْم")) t = toks.slice(4).join(" ");
  }
  return t;
}

const [{ n: existing }] = await sql`select count(*)::int as n from quran_ayahs`;
if (existing > 0) {
  console.log(`ℹ️ يوجد ${existing} آية مسبقاً — تخطّي بذر القرآن.`);
} else {
  // اشتقاق عدد الآيات من قائمة الآيات (المصدر لا يضمّنه دائماً)
  const ayahCount = {};
  for (const a of ayahs) ayahCount[a.s] = (ayahCount[a.s] ?? 0) + 1;

  await sql`
    insert into quran_surahs ${sql(
      surahs.map((s) => ({
        number: s.number,
        name_ar: s.name_ar,
        name_en: s.name_en ?? null,
        ayah_count: s.ayah_count ?? ayahCount[s.number] ?? 0,
        revelation: s.revelation ?? null,
      })),
      "number",
      "name_ar",
      "name_en",
      "ayah_count",
      "revelation",
    )}`;

  // إدراج الآيات على دفعات لتفادي حدود الاستعلام
  const rows = ayahs.map((a) => ({
    surah_number: a.s,
    ayah_number: a.a,
    juz_number: a.juz,
    page_number: a.page,
    text: cleanAyahText(a.text, a.s, a.a),
  }));
  const BATCH = 500;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await sql`
      insert into quran_ayahs ${sql(
        chunk,
        "surah_number",
        "ayah_number",
        "juz_number",
        "page_number",
        "text",
      )}`;
  }
  console.log(`✅ بُذر ${surahs.length} سورة و${rows.length} آية.`);
}

// القرّاء (مجلدات everyayah.com)
// المصدر = معرّف التلاوة في quran.com (يوفّر توقيتات الكلمات segments)
const reciters = [
  { name_ar: "محمود خليل الحصري", name_en: "Mahmoud Khalil Al-Husary", source: "6" },
  { name_ar: "محمد صديق المنشاوي (مرتّل)", name_en: "Mohamed Siddiq El-Minshawi (Murattal)", source: "9" },
  { name_ar: "عبد الباسط عبد الصمد (مرتّل)", name_en: "Abdul Basit (Murattal)", source: "2" },
  { name_ar: "مشاري العفاسي", name_en: "Mishary Alafasy", source: "7" },
];
for (const r of reciters) {
  await sql`
    insert into reciters (name_ar, name_en, source)
    select ${r.name_ar}, ${r.name_en}, ${r.source}
    where not exists (select 1 from reciters where source = ${r.source})`;
}
const [{ n: rc }] = await sql`select count(*)::int as n from reciters`;
console.log(`✅ القرّاء: ${rc}`);

await sql.end();
