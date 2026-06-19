// يجلب تخطيط مصحف المدينة (رقم السطر لكل كلمة) لكل الصفحات الـ604 من quran.com.
// التشغيل: node scripts/fetch-quran-layout.mjs  (يحتاج إنترنت مرة واحدة)
// المخرجات: db/seed/quran-layout.json
import { mkdirSync, writeFileSync } from "node:fs";

const TOTAL_PAGES = 604;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchPage(p, attempt = 1) {
  const url = `https://api.quran.com/api/v4/verses/by_page/${p}?words=true&word_fields=line_number,text_uthmani,code_v2,v2_page&per_page=300`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    if (attempt < 4) {
      await delay(500 * attempt);
      return fetchPage(p, attempt + 1);
    }
    throw e;
  }
}

const words = [];
for (let p = 1; p <= TOTAL_PAGES; p++) {
  const data = await fetchPage(p);
  let seq = 0;
  for (const v of data.verses ?? []) {
    const [s, a] = v.verse_key.split(":").map(Number);
    for (const w of v.words ?? []) {
      const isEnd = w.char_type_name === "end";
      words.push({
        p,
        l: w.line_number,
        s,
        a,
        pos: w.position,
        end: isEnd,
        t: isEnd ? "" : (w.text_uthmani ?? ""),
        c: w.code_v2 ?? "",
        vp: w.v2_page ?? p,
        seq: seq++,
      });
    }
  }
  if (p % 50 === 0) console.log(`… ${p}/${TOTAL_PAGES}`);
  await delay(60);
}

mkdirSync("db/seed", { recursive: true });
writeFileSync("db/seed/quran-layout.json", JSON.stringify({ words }));
console.log(`✅ حُفظ db/seed/quran-layout.json — ${words.length} كلمة عبر ${TOTAL_PAGES} صفحة`);
