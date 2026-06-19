"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  juzName,
  qcfFontUrl,
  type JuzNav,
  type PageWord,
  type SurahHeader,
  type SurahNav,
} from "@/lib/mushaf/data";
import { computeRange, inRange as inRangeOf } from "@/lib/mushaf/range";

const toAr = (n: number) => n.toLocaleString("ar-EG");
const QURAN_FONT = "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif";

export type RangeValue = {
  surahNumber: number | null;
  surahName: string;
  ayahFrom: number | null;
  ayahTo: number | null;
};

type PageData = { juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };

export function MushafRangePicker({
  surahNav,
  juzNav,
  totalPages,
  initialPage,
  value,
  onChange,
}: {
  surahNav: SurahNav[];
  juzNav: JuzNav[];
  totalPages: number;
  initialPage: number;
  value: RangeValue;
  onChange: (v: RangeValue) => void;
}) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PageData>({ juz: null, words: [], surahHeaders: [] });
  const [loading, setLoading] = useState(true);
  const [jump, setJump] = useState("");
  // step: 0 → next ayah click starts a new range; 1 → next click sets the end
  const [step, setStep] = useState<0 | 1>(0);
  const cacheRef = useRef<Record<number, PageData>>({});

  useEffect(() => {
    let active = true;
    const cached = cacheRef.current[page];
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/quran/page/${page}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: PageData) => {
        if (!active) return;
        const pd = { juz: d.juz, words: d.words ?? [], surahHeaders: d.surahHeaders ?? [] };
        cacheRef.current[page] = pd;
        setData(pd);
      })
      .catch(() => active && setData({ juz: null, words: [], surahHeaders: [] }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  const { words, surahHeaders, juz } = data;
  const lineMap = new Map<number, PageWord[]>();
  for (const w of words) {
    if (!lineMap.has(w.line)) lineMap.set(w.line, []);
    lineMap.get(w.line)!.push(w);
  }
  const lineNos = [...lineMap.keys()].sort((a, b) => a - b);
  const headerByLine = new Map<number, SurahHeader>();
  for (const h of surahHeaders) headerByLine.set(h.first_line, h);
  const nameOf = (surah: number) => surahNav.find((s) => s.number === surah)?.name_ar ?? `سورة ${surah}`;

  function go(p: number) {
    setPage(Math.min(totalPages, Math.max(1, p)));
  }
  function doJump() {
    const p = Number(jump);
    if (Number.isInteger(p)) go(p);
    setJump("");
  }

  function pick(surah: number, ayah: number) {
    const { surahNumber, ayahFrom, ayahTo, step: nextStep } = computeRange(value, surah, ayah, step);
    onChange({ surahNumber, surahName: nameOf(surah), ayahFrom, ayahTo });
    setStep(nextStep);
  }

  function clearRange() {
    onChange({ surahNumber: null, surahName: "", ayahFrom: null, ayahTo: null });
    setStep(0);
  }

  const inRange = (surah: number, ayah: number) => inRangeOf(value, surah, ayah);

  return (
    <div className="space-y-3">
      <Card className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">السورة</span>
          <Select
            value={words[0]?.surah ?? ""}
            onChange={(e) => {
              const s = surahNav.find((x) => x.number === Number(e.target.value));
              if (s) go(s.start_page);
            }}
            className="h-9 w-48"
          >
            {surahNav.map((s) => (
              <option key={s.number} value={s.number}>{toAr(s.number)}. {s.name_ar}</option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">الجزء</span>
          <Select
            value={juz ?? ""}
            onChange={(e) => {
              const j = juzNav.find((x) => x.juz === Number(e.target.value));
              if (j) go(j.start_page);
            }}
            className="h-9 w-40"
          >
            {juzNav.map((j) => (
              <option key={j.juz} value={j.juz}>{juzName(j.juz)}</option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <Button type="button" size="sm" variant="outline" onClick={() => go(page + 1)} disabled={page >= totalPages}>← التالي</Button>
          <span className="text-xs text-muted">صفحة {toAr(page)}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => go(page - 1)} disabled={page <= 1}>السابق →</Button>
          <Input value={jump} onChange={(e) => setJump(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doJump()} type="number" min={1} max={totalPages} placeholder="صفحة" className="h-9 w-24" />
          <Button type="button" size="sm" variant="outline" onClick={doJump}>اذهب</Button>
        </div>
      </Card>

      <div className="rounded-lg border border-dashed border-gold/50 bg-gold-subtle/40 px-4 py-2 text-center text-sm">
        {value.ayahFrom == null ? (
          <span className="text-muted">اضغط آية البداية ثم آية النهاية لتحديد ما درسه الطالب.</span>
        ) : (
          <span className="font-medium text-brand">
            المقطع المُدرَّس: {value.surahName} — من آية {toAr(value.ayahFrom)} إلى آية {toAr(value.ayahTo ?? value.ayahFrom)}
            {step === 1 && <span className="text-muted"> · اضغط آية النهاية…</span>}
            <button type="button" onClick={clearRange} className="ms-2 text-xs text-danger hover:underline">مسح</button>
          </span>
        )}
      </div>

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
                          const hit = inRange(w.surah, w.ayah);
                          if (w.end) {
                            return (
                              <span
                                key={i}
                                role="button"
                                title="تحديد هذه الآية"
                                onClick={() => pick(w.surah, w.ayah)}
                                className={`mx-0.5 inline-grid h-7 w-7 cursor-pointer place-items-center rounded-full border text-xs ${
                                  hit ? "border-brand bg-brand/25 text-brand" : "border-gold/50 bg-gold-subtle text-brand"
                                }`}
                              >
                                {toAr(w.ayah)}
                              </span>
                            );
                          }
                          return (
                            <span
                              key={i}
                              role="button"
                              title="تحديد هذه الآية"
                              onClick={() => pick(w.surah, w.ayah)}
                              style={{ fontFamily: `'qcf2-p${w.vpage}'` }}
                              className={`cursor-pointer rounded px-0.5 ${hit ? "bg-brand/20" : "hover:bg-brand/10"}`}
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
    </div>
  );
}
