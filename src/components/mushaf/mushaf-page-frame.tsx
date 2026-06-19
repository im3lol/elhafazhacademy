"use client";

import { Fragment } from "react";
import {
  MISTAKE_TYPES,
  juzName,
  qcfFontUrl,
  type MistakeType,
  type PageWord,
  type SurahHeader,
} from "@/lib/mushaf/data";

const toAr = (n: number) => n.toLocaleString("ar-EG");
const QURAN_FONT = "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif";
const wkey = (s: number, a: number, w: number | null) => `${s}:${a}:${w ?? ""}`;

/**
 * إطار صفحة المصحف العرضي (قراءة فقط) — يرسم الأسطر/الكلمات/البسملة/الإطار بخط QCF،
 * مع إبراز اختياري للكلمات المعلَّمة عبر خريطة `marked`. مكوّن مشترك قابل لإعادة الاستخدام.
 */
export function MushafPageFrame({
  words,
  surahHeaders,
  juz,
  page,
  loading,
  nameOf,
  marked,
}: {
  words: PageWord[];
  surahHeaders: SurahHeader[];
  juz: number | null;
  page: number;
  loading?: boolean;
  nameOf: (surah: number) => string;
  marked?: Map<string, MistakeType>;
}) {
  const lineMap = new Map<number, PageWord[]>();
  for (const w of words) {
    if (!lineMap.has(w.line)) lineMap.set(w.line, []);
    lineMap.get(w.line)!.push(w);
  }
  const lineNos = [...lineMap.keys()].sort((a, b) => a - b);
  const headerByLine = new Map<number, SurahHeader>();
  for (const h of surahHeaders) headerByLine.set(h.first_line, h);

  return (
    <>
      <style>
        {[...new Set(words.map((w) => w.vpage))]
          .filter((vp) => vp > 0)
          .map((vp) => `@font-face{font-family:'qcf2-p${vp}';src:url('${qcfFontUrl(vp)}') format('woff2');font-display:swap;}`)
          .join("")}
      </style>

      <div className="rounded-2xl border-[3px] border-brand/30 bg-surface p-1.5">
        <div className="rounded-xl ring-1 ring-gold/40">
          <div className="px-4 py-5 sm:px-6">
            <div className="mb-4 flex items-center justify-between rounded-lg border border-gold/40 bg-brand-subtle px-4 py-1.5 font-display text-sm font-bold text-brand">
              <span>{nameOf(words[0]?.surah ?? 0)}</span>
              <span>{juzName(juz)}</span>
            </div>
            {loading ? (
              <p className="py-12 text-center text-muted">جارٍ التحميل…</p>
            ) : (
              <div className="space-y-1.5" style={{ fontFamily: QURAN_FONT }} dir="rtl">
                {lineNos.map((ln) => {
                  const lineWords = lineMap.get(ln)!;
                  const header = headerByLine.get(ln);
                  const contentCount = lineWords.filter((w) => !w.end).length;
                  const justify = contentCount >= 5 ? "justify-between" : "justify-center gap-x-2";
                  return (
                    <Fragment key={ln}>
                      {header && (
                        <div className="my-2">
                          <div className="mx-auto max-w-md rounded-lg border border-gold/40 bg-brand-subtle py-1.5 text-center font-display text-base font-black text-brand">
                            {header.name_ar}
                          </div>
                          {header.surah !== 1 && header.surah !== 9 && (
                            <div className="mt-1 text-center text-lg text-gold">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
                          )}
                        </div>
                      )}
                      <div className={`flex flex-wrap items-center ${justify} text-xl leading-snug sm:text-2xl`}>
                        {lineWords.map((w, i) => {
                          if (w.end) {
                            return (
                              <span
                                key={i}
                                className="mx-0.5 inline-grid h-7 w-7 place-items-center rounded-full border border-gold/50 bg-gold-subtle text-xs text-brand"
                              >
                                {toAr(w.ayah)}
                              </span>
                            );
                          }
                          const mtype = marked?.get(wkey(w.surah, w.ayah, w.pos));
                          return (
                            <span
                              key={i}
                              style={{ fontFamily: `'qcf2-p${w.vpage}'` }}
                              className={`px-0.5 ${mtype ? `underline decoration-2 underline-offset-[6px] ${MISTAKE_TYPES[mtype].soft.split(" ")[1]}` : ""}`}
                            >
                              {w.code}
                            </span>
                          );
                        })}
                      </div>
                    </Fragment>
                  );
                })}
              </div>
            )}
            <div className="mt-4 flex items-center justify-center border-t border-border pt-3">
              <span className="grid h-9 min-w-9 place-items-center rounded-full border border-gold/50 bg-gold-subtle px-3 font-display text-sm font-bold text-brand">{toAr(page)}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
