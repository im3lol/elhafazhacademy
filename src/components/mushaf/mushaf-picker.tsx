"use client";

import { Fragment, useEffect, useRef, useState, useActionState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { saveMushafProgress, addMushafMistake, type MushafState } from "@/lib/mushaf/actions";
import {
  MISTAKE_TYPES,
  MISTAKE_TYPE_KEYS,
  juzName,
  qcfFontUrl,
  type JuzNav,
  type MushafMistake,
  type MushafProgress,
  type PageWord,
  type SurahHeader,
  type SurahNav,
} from "@/lib/mushaf/data";

const toAr = (n: number) => n.toLocaleString("ar-EG");
const keyOf = (s: number, a: number) => `${s}:${a}`;
const QURAN_FONT = "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif";

type Selection = { surah: number; ayah: number; surahName: string; word: number | null } | null;
type PageData = { juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };

export function MushafPicker({
  studentId,
  surahNav,
  juzNav,
  progress,
  mistakes,
  initialPage,
  totalPages,
}: {
  studentId: string;
  surahNav: SurahNav[];
  juzNav: JuzNav[];
  progress: MushafProgress;
  mistakes: MushafMistake[];
  initialPage: number;
  totalPages: number;
}) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PageData>({ juz: null, words: [], surahHeaders: [] });
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<Selection>(null);
  const [jump, setJump] = useState("");
  const cacheRef = useRef<Record<number, PageData>>({});

  const [progState, progAction, progPending] = useActionState<MushafState, FormData>(saveMushafProgress, {});
  const [addState, addAction, addPending] = useActionState<MushafState, FormData>(addMushafMistake, {});

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

  const byKey = new Map<string, MushafMistake[]>();
  for (const m of mistakes) {
    const k = keyOf(m.surah_number, m.ayah_number);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(m);
  }
  const nameOf = (surah: number) => surahNav.find((s) => s.number === surah)?.name_ar ?? `سورة ${surah}`;

  function go(p: number) {
    setPage(Math.min(totalPages, Math.max(1, p)));
  }
  function doJump() {
    const p = Number(jump);
    if (Number.isInteger(p)) go(p);
    setJump("");
  }
  const lastKey = progress ? keyOf(progress.surah_number, progress.ayah_number) : null;

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">السورة</span>
          <Select
            value={words[0]?.surah ?? ""}
            onChange={(e) => { const s = surahNav.find((x) => x.number === Number(e.target.value)); if (s) go(s.start_page); }}
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
            onChange={(e) => { const j = juzNav.find((x) => x.juz === Number(e.target.value)); if (j) go(j.start_page); }}
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
                          const k = keyOf(w.surah, w.ayah);
                          const ms = byKey.get(k) ?? [];
                          const selectedAyah = sel && sel.surah === w.surah && sel.ayah === w.ayah;
                          if (w.end) {
                            return (
                              <span
                                key={i}
                                role="button"
                                title="تحديد الآية كاملة"
                                onClick={() => setSel({ surah: w.surah, ayah: w.ayah, surahName: nameOf(w.surah), word: null })}
                                className={`mx-0.5 inline-grid h-7 w-7 cursor-pointer place-items-center rounded-full border text-xs ${
                                  selectedAyah && sel!.word === null ? "border-brand bg-brand/20 text-brand" : "border-gold/50 bg-gold-subtle text-brand"
                                }`}
                              >
                                {toAr(w.ayah)}
                              </span>
                            );
                          }
                          const wm = ms.filter((m) => m.word_index === w.pos);
                          const marked = wm.length > 0;
                          const isSelWord = selectedAyah && sel!.word === w.pos;
                          return (
                            <span
                              key={i}
                              role="button"
                              title="تحديد هذه الكلمة"
                              onClick={() => setSel({ surah: w.surah, ayah: w.ayah, surahName: nameOf(w.surah), word: w.pos })}
                              style={{ fontFamily: `'qcf2-p${w.vpage}'` }}
                              className={[
                                "cursor-pointer rounded px-0.5",
                                isSelWord ? "bg-brand/30 ring-1 ring-brand" : lastKey === k ? "bg-gold/10" : "hover:bg-brand/10",
                                marked ? `underline decoration-2 underline-offset-[6px] ${MISTAKE_TYPES[wm[0].mistake_type].soft.split(" ")[1]}` : "",
                              ].join(" ")}
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

      {!sel ? (
        <Card className="text-center text-sm text-muted">اضغط على كلمة أو رقم آية في الصفحة لتحديد الموضع.</Card>
      ) : (
        <Card className="space-y-4 border-brand/30">
          <p className="font-display text-base font-bold">
            الموضع المحدّد: {sel.surahName} · آية {toAr(sel.ayah)}{sel.word != null ? ` · كلمة ${toAr(sel.word)}` : ""}
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            <form action={progAction} className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">آخر موضع وصل إليه الطالب</p>
              <input type="hidden" name="student_id" value={studentId} />
              <input type="hidden" name="surah_number" value={sel.surah} />
              <input type="hidden" name="ayah_number" value={sel.ayah} />
              {sel.word != null && <input type="hidden" name="word_index" value={sel.word} />}
              {progState.error && <p className="text-sm text-danger">{progState.error}</p>}
              {progState.success && <p className="text-sm text-brand">{progState.success}</p>}
              <Button type="submit" size="sm" disabled={progPending}>{progPending ? "حفظ…" : "تعيين كآخر موضع 📍"}</Button>
            </form>
            <form action={addAction} className="space-y-2 rounded-xl border border-border p-3">
              <p className="text-sm font-medium">تسجيل خطأ/ملاحظة هنا</p>
              <input type="hidden" name="student_id" value={studentId} />
              <input type="hidden" name="surah_number" value={sel.surah} />
              <input type="hidden" name="ayah_number" value={sel.ayah} />
              {sel.word != null && <input type="hidden" name="word_index" value={sel.word} />}
              <div className="grid gap-2 sm:grid-cols-2">
                <Select name="mistake_type" defaultValue="tajweed" className="h-9">
                  {MISTAKE_TYPE_KEYS.map((kk) => (
                    <option key={kk} value={kk}>{MISTAKE_TYPES[kk].label}</option>
                  ))}
                </Select>
                <Input name="title" placeholder="عنوان الخطأ" className="h-9" required />
              </div>
              <Textarea name="note" placeholder="ملاحظة قصيرة (اختياري)" className="min-h-16" />
              {addState.error && <p className="text-sm text-danger">{addState.error}</p>}
              {addState.success && <p className="text-sm text-brand">{addState.success}</p>}
              <Button type="submit" size="sm" disabled={addPending}>{addPending ? "إضافة…" : "إضافة الخطأ هنا"}</Button>
            </form>
          </div>
        </Card>
      )}
    </div>
  );
}
