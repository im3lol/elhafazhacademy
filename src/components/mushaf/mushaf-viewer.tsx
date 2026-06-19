"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import {
  MISTAKE_TYPES,
  juzName,
  qcfFontUrl,
  type Bookmark,
  type JuzNav,
  type MushafMistake,
  type MushafProgress,
  type PageWord,
  type Reciter,
  type SurahHeader,
  type SurahNav,
} from "@/lib/mushaf/data";

const toAr = (n: number) => n.toLocaleString("ar-EG");
const REPEATS = [1, 3, 5, 10];
const keyOf = (s: number, a: number) => `${s}:${a}`;
const QURAN_FONT = "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif";

// segment = [.., رقم الكلمة, بداية_ms, نهاية_ms]
type AudioEntry = { url: string; segments: number[][] };
const segWord = (s: number[]) => s[s.length - 3];
const segStart = (s: number[]) => s[s.length - 2];
const segEnd = (s: number[]) => s[s.length - 1];

function CornerOrnament({ className }: { className: string }) {
  return (
    <span className={`pointer-events-none absolute z-10 h-7 w-7 ${className}`} aria-hidden>
      <svg viewBox="0 0 32 32" className="h-full w-full drop-shadow">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x="14.6" y="2.5" width="2.8" height="7.5" rx="1.4" transform={`rotate(${i * 45} 16 16)`} className="fill-gold" />
        ))}
        <circle cx="16" cy="16" r="6" className="fill-brand stroke-gold" strokeWidth="1.4" />
        <circle cx="16" cy="16" r="2" className="fill-gold" />
      </svg>
    </span>
  );
}

type PageData = { juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };

export function MushafViewer({
  reciters,
  surahNav,
  juzNav,
  progress,
  mistakes,
  bookmarks,
  initialPage,
  totalPages,
}: {
  reciters: Reciter[];
  surahNav: SurahNav[];
  juzNav: JuzNav[];
  progress: MushafProgress;
  mistakes: MushafMistake[];
  bookmarks: Bookmark[];
  initialPage: number;
  totalPages: number;
}) {
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PageData>({ juz: null, words: [], surahHeaders: [] });
  const [loading, setLoading] = useState(true);
  const [reciterId, setReciterId] = useState(reciters[0]?.id ?? "");
  const [repeat, setRepeat] = useState(1);
  const [nowPlaying, setNowPlaying] = useState<string | null>(null);
  const [currentPos, setCurrentPos] = useState<number | null>(null);
  const [drawer, setDrawer] = useState<MushafMistake[] | null>(null);
  const [jump, setJump] = useState("");
  const [rangeFrom, setRangeFrom] = useState(0);
  const [rangeTo, setRangeTo] = useState(0);
  const [marks, setMarks] = useState<number[]>(() => bookmarks.map((b) => b.page_number).sort((a, b) => a - b));

  const [audioMap, setAudioMap] = useState<Record<string, AudioEntry>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sessionRef = useRef<{
    idx: number;
    left: number;
    mode: "single" | "page" | "range";
    from?: number;
    to?: number;
    loopsLeft?: number;
  } | null>(null);
  const seekMsRef = useRef(0);
  const autoplayRef = useRef(false);
  const cacheRef = useRef<Record<number, PageData>>({});
  const audioCacheRef = useRef<Record<string, Record<string, AudioEntry>>>({});
  const reciter = reciters.find((r) => r.id === reciterId) ?? reciters[0];

  useEffect(() => {
    let active = true;
    stop();
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

  // جلب صوت الصفحة (روابط + توقيتات الكلمات) للقارئ المختار
  useEffect(() => {
    if (!reciter) return;
    let active = true;
    stop();
    const ck = `${reciter.source}:${page}`;
    const cached = audioCacheRef.current[ck];
    if (cached) {
      setAudioMap(cached);
      return;
    }
    setAudioMap({});
    fetch(`/api/quran/audio/${reciter.source}/${page}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { audio?: Record<string, AudioEntry> }) => {
        if (!active) return;
        const m = d.audio ?? {};
        audioCacheRef.current[ck] = m;
        setAudioMap(m);
      })
      .catch(() => active && setAudioMap({}));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, reciterId]);

  // حفظ/استرجاع القارئ المختار من المتصفح
  useEffect(() => {
    try {
      const r = localStorage.getItem("mushaf_reciter");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- استرجاع القارئ المحفوظ من المتصفح بعد الإماهة
      if (r && reciters.some((x) => x.id === r)) setReciterId(r);
    } catch {
      /* تجاهل */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      if (reciterId) localStorage.setItem("mushaf_reciter", reciterId);
    } catch {
      /* تجاهل */
    }
  }, [reciterId]);

  // تمرير تلقائي لإبقاء الكلمة الجارية مرئية أثناء التلاوة
  useEffect(() => {
    if (!nowPlaying) return;
    const el = document.querySelector<HTMLElement>('[data-playing="1"]');
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [nowPlaying, currentPos]);

  const { words, surahHeaders, juz } = data;

  // تجميع حسب السطر
  const lineMap = new Map<number, PageWord[]>();
  for (const w of words) {
    if (!lineMap.has(w.line)) lineMap.set(w.line, []);
    lineMap.get(w.line)!.push(w);
  }
  const lineNos = [...lineMap.keys()].sort((a, b) => a - b);
  const headerByLine = new Map<number, SurahHeader>();
  for (const h of surahHeaders) headerByLine.set(h.first_line, h);

  // ترتيب الآيات على الصفحة (للتشغيل) + نصوص كل آية بالترتيب (للتمييز/القفز)
  const ayahsOnPage: { surah: number; ayah: number }[] = [];
  const seen = new Set<string>();
  for (const w of words) {
    const k = keyOf(w.surah, w.ayah);
    if (!seen.has(k)) {
      seen.add(k);
      ayahsOnPage.push({ surah: w.surah, ayah: w.ayah });
    }
  }
  const ayahIndex = (s: number, a: number) => ayahsOnPage.findIndex((x) => x.surah === s && x.ayah === a);

  const byKey = new Map<string, MushafMistake[]>();
  for (const m of mistakes) {
    const k = keyOf(m.surah_number, m.ayah_number);
    if (!byKey.has(k)) byKey.set(k, []);
    byKey.get(k)!.push(m);
  }

  // بعد انتقال تلقائي لصفحة جديدة: تابع التلاوة من أول آية فور جاهزية الصوت
  useEffect(() => {
    if (!autoplayRef.current) return;
    if (!ayahsOnPage.length || !Object.keys(audioMap).length) return;
    autoplayRef.current = false;
    play(0, true, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioMap, words]);

  // إعادة ضبط نطاق الحفظ ليشمل آيات الصفحة الحالية عند تغيّرها
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- إعادة ضبط النطاق عند تغيّر آيات الصفحة
    setRangeFrom(0);
    setRangeTo(Math.max(0, ayahsOnPage.length - 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [words]);

  type Session = NonNullable<typeof sessionRef.current>;
  function start(idx: number, startMs: number, session: Session) {
    const el = audioRef.current;
    const a = ayahsOnPage[idx];
    if (!el || !a) return;
    const entry = audioMap[keyOf(a.surah, a.ayah)];
    if (!entry?.url) return;
    sessionRef.current = session;
    seekMsRef.current = startMs;
    el.src = entry.url;
    el.play().catch(() => {});
    setNowPlaying(keyOf(a.surah, a.ayah));
    setCurrentPos(null);
  }
  function play(idx: number, pageMode: boolean, startMs = 0) {
    start(idx, startMs, { idx, left: repeat - 1, mode: pageMode ? "page" : "single" });
  }
  // وضع الحفظ: يكرّر المقطع [from..to] بعدد التكرارات (كل آية مرة واحدة، والمقطع يُعاد)
  function playRange(fromIdx: number, toIdx: number) {
    let from = fromIdx, to = toIdx;
    if (from > to) [from, to] = [to, from];
    if (!ayahsOnPage[from]) return;
    start(from, 0, { idx: from, left: 0, mode: "range", from, to, loopsLeft: repeat });
  }
  function stop() {
    sessionRef.current = null;
    audioRef.current?.pause();
    setNowPlaying(null);
    setCurrentPos(null);
  }
  function onLoadedMetadata() {
    const el = audioRef.current;
    if (!el) return;
    if (seekMsRef.current > 0) el.currentTime = seekMsRef.current / 1000;
    seekMsRef.current = 0;
  }
  function onTimeUpdate() {
    const s = sessionRef.current;
    const el = audioRef.current;
    if (!s || !el) return;
    const a = ayahsOnPage[s.idx];
    if (!a) return;
    const segs = audioMap[keyOf(a.surah, a.ayah)]?.segments ?? [];
    if (!segs.length) return;
    const ms = el.currentTime * 1000;
    let pos: number | null = null;
    for (const seg of segs) {
      if (ms >= segStart(seg) && ms < segEnd(seg)) {
        pos = segWord(seg);
        break;
      }
    }
    setCurrentPos((prev) => (prev === pos ? prev : pos));
  }
  function onEnded() {
    const s = sessionRef.current;
    const el = audioRef.current;
    if (!s || !el) return;
    if (s.left > 0) {
      s.left -= 1;
      el.currentTime = 0;
      el.play().catch(() => {});
      return;
    }
    if (s.mode === "range") {
      if (s.idx < (s.to ?? s.idx)) {
        start(s.idx + 1, 0, { ...s, idx: s.idx + 1 });
      } else if ((s.loopsLeft ?? 1) > 1) {
        start(s.from ?? 0, 0, { ...s, idx: s.from ?? 0, loopsLeft: (s.loopsLeft ?? 1) - 1 });
      } else {
        stop();
      }
      return;
    }
    if (s.mode === "page" && s.idx + 1 < ayahsOnPage.length) {
      play(s.idx + 1, true);
      return;
    }
    // نهاية الصفحة في وضع التشغيل المستمر → الانتقال للصفحة التالية ومواصلة التلاوة
    if (s.mode === "page" && page < totalPages) {
      autoplayRef.current = true;
      go(page + 1);
      return;
    }
    stop();
  }
  function playWord(w: PageWord) {
    const idx = ayahIndex(w.surah, w.ayah);
    if (idx < 0) return;
    const segs = audioMap[keyOf(w.surah, w.ayah)]?.segments ?? [];
    const seg = segs.find((x) => segWord(x) === w.pos);
    play(idx, true, seg ? segStart(seg) : 0);
  }

  function go(p: number) {
    setPage(Math.min(totalPages, Math.max(1, p)));
  }
  function doJump() {
    const p = Number(jump);
    if (Number.isInteger(p)) go(p);
    setJump("");
  }
  const isMarked = marks.includes(page);
  async function toggleBookmark() {
    const optimistic = isMarked ? marks.filter((p) => p !== page) : [...marks, page].sort((a, b) => a - b);
    setMarks(optimistic);
    try {
      const res = await fetch("/api/student/mushaf/bookmark", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page }),
      });
      const d = (await res.json()) as { bookmarked: boolean };
      setMarks((cur) => {
        const has = cur.includes(page);
        if (d.bookmarked && !has) return [...cur, page].sort((a, b) => a - b);
        if (!d.bookmarked && has) return cur.filter((p) => p !== page);
        return cur;
      });
    } catch {
      setMarks((cur) => (isMarked ? [...cur, page].sort((a, b) => a - b) : cur.filter((p) => p !== page)));
    }
  }

  const lastKey = progress ? keyOf(progress.surah_number, progress.ayah_number) : null;
  const surahName = surahNav.find((s) => s.number === words[0]?.surah)?.name_ar ?? "";

  return (
    <div className="space-y-5 pb-24">
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
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">القارئ</span>
          <Select value={reciterId} onChange={(e) => setReciterId(e.target.value)} className="h-9 w-48">
            {reciters.map((r) => (
              <option key={r.id} value={r.id}>{r.name_ar}</option>
            ))}
          </Select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">تكرار</span>
          <Select value={repeat} onChange={(e) => setRepeat(Number(e.target.value))} className="h-9 w-20">
            {REPEATS.map((r) => (
              <option key={r} value={r}>{toAr(r)}×</option>
            ))}
          </Select>
        </label>
        {marks.length > 0 && (
          <label className="flex items-center gap-2 text-sm">
            <span className="text-muted">علاماتي</span>
            <Select value="" onChange={(e) => e.target.value && go(Number(e.target.value))} className="h-9 w-36">
              <option value="">{toAr(marks.length)} علامة محفوظة…</option>
              {marks.map((p) => (
                <option key={p} value={p}>صفحة {toAr(p)}</option>
              ))}
            </Select>
          </label>
        )}
        {progress && (
          <Button type="button" size="sm" variant="outline" onClick={() => go(progress.page_number ?? 1)} className="ms-auto">
            📍 آخر موضع (ص {toAr(progress.page_number ?? 0)})
          </Button>
        )}
      </Card>

      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {Object.values(MISTAKE_TYPES).map((t) => (
          <span key={t.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2.5 w-2.5 rounded-full ${t.dot}`} />
            {t.label}
          </span>
        ))}
      </div>

      {ayahsOnPage.length > 0 && (
        <Card className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-brand">وضع الحفظ</span>
          <span className="text-muted">— كرّر مقطعاً:</span>
          <span className="text-muted">من آية</span>
          <Select value={rangeFrom} onChange={(e) => setRangeFrom(Number(e.target.value))} className="h-9 w-24">
            {ayahsOnPage.map((a, i) => (
              <option key={i} value={i}>{toAr(a.ayah)}</option>
            ))}
          </Select>
          <span className="text-muted">إلى</span>
          <Select value={rangeTo} onChange={(e) => setRangeTo(Number(e.target.value))} className="h-9 w-24">
            {ayahsOnPage.map((a, i) => (
              <option key={i} value={i}>{toAr(a.ayah)}</option>
            ))}
          </Select>
          <Button type="button" size="sm" onClick={() => playRange(rangeFrom, rangeTo)} disabled={!Object.keys(audioMap).length}>
            ▶ كرّر المقطع ({toAr(repeat)}×)
          </Button>
        </Card>
      )}

      <style>
        {[...new Set(words.map((w) => w.vpage))]
          .filter((vp) => vp > 0)
          .map((vp) => `@font-face{font-family:'qcf2-p${vp}';src:url('${qcfFontUrl(vp)}') format('woff2');font-display:swap;}`)
          .join("")}
      </style>

      {/* صفحة المصحف بتخطيط الأسطر */}
      <div className="relative mx-auto max-w-3xl">
        <CornerOrnament className="-right-2.5 -top-2.5" />
        <CornerOrnament className="-left-2.5 -top-2.5" />
        <CornerOrnament className="-bottom-2.5 -right-2.5" />
        <CornerOrnament className="-bottom-2.5 -left-2.5" />
        <div className="rounded-[18px] bg-brand p-[6px] shadow-lg">
          <div className="rounded-[13px] border-2 border-gold/60 p-[3px]">
            <div className="rounded-[9px] bg-surface px-4 py-5 sm:px-7">
              <div className="mb-4 flex items-center justify-between rounded-lg border border-gold/40 bg-brand-subtle px-4 py-1.5 font-display text-sm font-bold text-brand">
                <span>{surahName}</span>
                <span>{juzName(juz)}</span>
              </div>

              {loading ? (
                <p className="py-16 text-center text-muted">جارٍ التحميل…</p>
              ) : words.length === 0 ? (
                <p className="py-16 text-center text-muted">لا توجد بيانات لهذه الصفحة.</p>
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
                              <div className="mt-1 text-center text-xl text-gold">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>
                            )}
                          </div>
                        )}
                        <div className={`flex flex-wrap items-center ${justify} text-xl leading-snug sm:text-2xl sm:text-[1.6rem]`}>
                          {lineWords.map((w, i) => {
                            const k = keyOf(w.surah, w.ayah);
                            if (w.end) {
                              const ms = byKey.get(k) ?? [];
                              return (
                                <span key={i} className="inline-flex items-center">
                                  <span role="button" onClick={() => { const idx = ayahIndex(w.surah, w.ayah); if (idx >= 0) play(idx, true, 0); }} title="تشغيل الآية" className="cursor-pointer">
                                    <span className="px-0.5 text-2xl text-brand" style={{ fontFamily: `'qcf2-p${w.vpage}'` }}>{w.code}</span>
                                  </span>
                                  {lastKey === k && <span className="text-sm">📍</span>}
                                  {ms.filter((m) => m.word_index == null).map((m) => (
                                    <span key={m.id} role="button" onClick={() => setDrawer([m])} className={`mx-0.5 inline-block h-2.5 w-2.5 cursor-pointer rounded-full ${MISTAKE_TYPES[m.mistake_type].dot}`} />
                                  ))}
                                </span>
                              );
                            }
                            const wm = (byKey.get(k) ?? []).filter((m) => m.word_index === w.pos);
                            const marked = wm.length > 0;
                            const playingWord = nowPlaying === k && currentPos === w.pos;
                            return (
                              <span key={i} className="inline-flex items-center">
                                <span
                                  role="button"
                                  onClick={() => playWord(w)}
                                  title="تشغيل من هنا"
                                  data-playing={playingWord ? "1" : undefined}
                                  style={{ fontFamily: `'qcf2-p${w.vpage}'` }}
                                  className={[
                                    "cursor-pointer rounded px-0.5",
                                    playingWord ? "bg-brand/25" : lastKey === k ? "bg-gold/10" : "hover:bg-brand/10",
                                    marked ? `underline decoration-2 underline-offset-[6px] ${MISTAKE_TYPES[wm[0].mistake_type].soft.split(" ")[1]}` : "",
                                  ].join(" ")}
                                >
                                  {w.code}
                                </span>
                                {marked && (
                                  <span role="button" onClick={(e) => { e.stopPropagation(); setDrawer(wm); }} className={`inline-block h-2 w-2 cursor-pointer rounded-full align-super ${MISTAKE_TYPES[wm[0].mistake_type].dot}`} />
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </Fragment>
                    );
                  })}
                </div>
              )}

              <div className="mt-5 flex items-center justify-center border-t border-border pt-3">
                <span className="grid h-10 min-w-10 place-items-center rounded-full border border-gold/50 bg-gold-subtle px-3 font-display text-sm font-bold text-brand">
                  {toAr(page)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Card className="flex flex-wrap items-center justify-center gap-2">
        <span className="text-sm text-muted">انتقال سريع:</span>
        <Input value={jump} onChange={(e) => setJump(e.target.value)} onKeyDown={(e) => e.key === "Enter" && doJump()} type="number" min={1} max={totalPages} placeholder="رقم الصفحة" className="h-9 w-32" />
        <Button type="button" size="sm" variant="outline" onClick={doJump}>اذهب</Button>
      </Card>

      <audio ref={audioRef} onEnded={onEnded} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoadedMetadata} preload="none" />

      {reciter && (
        <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-background/95 px-4 py-2 backdrop-blur lg:right-64">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              {nowPlaying ? (
                <Button type="button" size="sm" variant="outline" onClick={stop}>⏸ إيقاف</Button>
              ) : (
                <Button type="button" size="sm" onClick={() => play(0, true, 0)} disabled={!ayahsOnPage.length}>▶ تشغيل الصفحة</Button>
              )}
              <Button type="button" size="sm" variant="outline" onClick={toggleBookmark} className={isMarked ? "text-gold" : ""}>
                {isMarked ? "★ محفوظة" : "☆ علامة"}
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button type="button" size="sm" variant="outline" onClick={() => go(page + 1)} disabled={page >= totalPages}>← التالي</Button>
              <span className="px-1 text-xs text-muted">{toAr(page)}/{toAr(totalPages)}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => go(page - 1)} disabled={page <= 1}>السابق →</Button>
            </div>
          </div>
        </div>
      )}

      {drawer && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={() => setDrawer(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="relative w-full max-w-lg space-y-3 rounded-t-2xl border border-border bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold">تفاصيل الملاحظة</h3>
              <button type="button" onClick={() => setDrawer(null)} className="text-muted hover:text-foreground">✕</button>
            </div>
            {drawer.map((m) => {
              const meta = MISTAKE_TYPES[m.mistake_type];
              const idx = ayahIndex(m.surah_number, m.ayah_number);
              return (
                <div key={m.id} className="space-y-1 rounded-xl border border-border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.soft}`}>{meta.label}</span>
                    {m.is_resolved && <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">تم حلّه</span>}
                    <span className="text-xs text-muted">آية {toAr(m.ayah_number)}{m.word_index != null ? ` · كلمة ${toAr(m.word_index)}` : ""}</span>
                  </div>
                  <p className="font-medium">{m.title}</p>
                  {m.note && <p className="text-sm text-muted">{m.note}</p>}
                  {idx >= 0 && <Button type="button" size="sm" variant="outline" onClick={() => play(idx, false, 0)}>▶ استمع للآية</Button>}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
