// يحمّل تخطيط الأسطر من db/seed/quran-layout.json إلى جدول quran_words.
// التشغيل: node scripts/seed-quran-layout.mjs   (لا يحتاج إنترنت)
import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = process.env.DATABASE_URL
  ? { DATABASE_URL: process.env.DATABASE_URL }
  : Object.fromEntries(
      readFileSync(new URL("../.env.local", import.meta.url), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );

const sql = postgres(env.DATABASE_URL, { max: 1 });
const { words } = JSON.parse(readFileSync(new URL("../db/seed/quran-layout.json", import.meta.url), "utf8"));

const [{ n: existing }] = await sql`select count(*)::int as n from quran_words`;
if (existing > 0) {
  console.log(`ℹ️ يوجد ${existing} كلمة مسبقاً — تخطّي.`);
} else {
  const rows = words.map((w) => ({
    page_number: w.p,
    line_number: w.l,
    surah_number: w.s,
    ayah_number: w.a,
    position: w.pos,
    is_end: w.end,
    seq: w.seq,
    text: w.t ?? "",
    code_v2: w.c ?? "",
    v2_page: w.vp ?? w.p,
  }));
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH);
    await sql`insert into quran_words ${sql(
      chunk,
      "page_number",
      "line_number",
      "surah_number",
      "ayah_number",
      "position",
      "is_end",
      "seq",
      "text",
      "code_v2",
      "v2_page",
    )}`;
  }
  console.log(`✅ بُذر ${rows.length} كلمة.`);
}

await sql.end();
