// يفصل البسملة عن نص الآية الأولى لكل السور عدا الفاتحة (حيث البسملة = الآية ١).
// كما يزيل علامة BOM إن وُجدت. آمن للتكرار. التشغيل: node scripts/fix-basmala.mjs
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

/** يزيل BOM، ويفصل البسملة (أول ٤ كلمات) من الآية ١ لغير الفاتحة. */
export function cleanAyahText(text, surah, ayah) {
  let t = text.replace(/^﻿/, "").trim();
  if (surah !== 1 && ayah === 1) {
    const toks = t.split(/\s+/);
    if (toks.length > 4 && toks[0].startsWith("بِسْم")) {
      t = toks.slice(4).join(" ");
    }
  }
  return t;
}

const rows = await sql`select surah_number, ayah_number, text from quran_ayahs where ayah_number = 1`;
let changed = 0;
for (const r of rows) {
  const cleaned = cleanAyahText(r.text, r.surah_number, r.ayah_number);
  if (cleaned !== r.text) {
    await sql`update quran_ayahs set text = ${cleaned} where surah_number = ${r.surah_number} and ayah_number = ${r.ayah_number}`;
    changed++;
  }
}
console.log(`✅ نُظّفت ${changed} آية أولى (فُصلت البسملة عن غير الفاتحة).`);

await sql.end();
