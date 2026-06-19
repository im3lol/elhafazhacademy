"use client";

import { Fragment, useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { addMushafMistake, type MushafState } from "@/lib/mushaf/actions";
import {
  MISTAKE_TYPES,
  MISTAKE_TYPE_KEYS,
  juzName,
  qcfFontUrl,
  type JuzNav,
  type MistakeType,
  type PageWord,
  type SurahHeader,
  type SurahNav,
} from "@/lib/mushaf/data";

const toAr = (n: number) => n.toLocaleString("ar-EG");
const QURAN_FONT = "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif";
const wkey = (s: number, a: number, w: number | null) => `${s}:${a}:${w ?? ""}`;

function PresencePill({ label, online, className = "" }: { label: string; online: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
        online ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
      } ${className}`}
    >
      <span className={`inline-block h-2 w-2 rounded-full ${online ? "bg-success" : "bg-muted"}`} />
      {label}: {online ? "متصل" : "غير متصل"}
    </span>
  );
}

type PageData = { juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };
type Role = "teacher" | "student" | "admin";
type Selection = { surah: number; ayah: number; word: number | null; surahName: string } | null;
export type MarkedWord = { surah_number: number; ayah_number: number; word_index: number | null; mistake_type: MistakeType };

export function LiveMushafRoom({
  classId,
  studentId,
  role,
  surahNav,
  juzNav,
  totalPages,
  initialPage,
  mistakes,
}: {
  classId: string;
  studentId: string;
  role: Role;
  surahNav: SurahNav[];
  juzNav: JuzNav[];
  totalPages: number;
  initialPage: number;
  mistakes: MarkedWord[];
}) {
  const isPresenter = role === "teacher";
  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<PageData>({ juz: null, words: [], surahHeaders: [] });
  const [loading, setLoading] = useState(true);
  const [jump, setJump] = useState("");
  const [following, setFollowing] = useState(!isPresenter);
  const [teacherPage, setTeacherPage] = useState<number | null>(null);
  const [otherOnline, setOtherOnline] = useState(false);
  const [sel, setSel] = useState<Selection>(null);
  const [mistakeType, setMistakeType] = useState<MistakeType>("tajweed");
  const [marked, setMarked] = useState<Map<string, MistakeType>>(
    () => new Map(mistakes.map((m) => [wkey(m.surah_number, m.ayah_number, m.word_index), m.mistake_type])),
  );
  const cacheRef = useRef<Record<number, PageData>>({});
  const lastSentRef = useRef<number | null>(null);

  const [addState, addAction, addPending] = useActionState<MushafState, FormData>(addMushafMistake, {});

  // عند نجاح إضافة خطأ: علّم الكلمة محلياً بالنوع المختار وأغلق النموذج
  useEffect(() => {
    if (addState.success && sel) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- استجابة لنتيجة الإجراء (تعليم الكلمة بعد النجاح)
      setMarked((prev) => {
        const next = new Map(prev);
        next.set(wkey(sel.surah, sel.ayah, sel.word), mistakeType);
        return next;
      });
      setSel(null);
      setMistakeType("tajweed");
    }
    // نعتمد على مرجع الحالة كاملاً (جديد بعد كل إرسال) كي يُعاد التشغيل لكل خطأ — لا على نص النجاح الثابت.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addState]);

  // تحميل بيانات الصفحة
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

  // المعلم: بثّ الصفحة المعروضة
  useEffect(() => {
    if (!isPresenter) return;
    if (lastSentRef.current === page) return;
    lastSentRef.current = page;
    fetch(`/api/classes/${classId}/live`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ page }),
    }).catch(() => {});
  }, [isPresenter, classId, page]);

  // استطلاع كل ٣ث: نبضة حضور للجميع + متابعة موضع المعلم وإبراز أخطائه للطالب/الأدمن
  useEffect(() => {
    let active = true;
    const poll = () => {
      fetch(`/api/classes/${classId}/live`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { page: number | null; mistakes?: MarkedWord[]; teacherOnline?: boolean; studentOnline?: boolean } | null) => {
          if (!active || !d) return;
          // حضور الطرف الآخر
          setOtherOnline(isPresenter ? !!d.studentOnline : !!d.teacherOnline);
          if (isPresenter) return; // المعلم لا يتابع نفسه
          // إبراز ما يعلّمه المعلم لحظياً
          if (d.mistakes) {
            setMarked(new Map(d.mistakes.map((m) => [wkey(m.surah_number, m.ayah_number, m.word_index), m.mistake_type])));
          }
          if (d.page == null) return;
          setTeacherPage(d.page);
          setFollowing((f) => {
            if (f) setPage((p) => (p === d.page ? p : d.page!));
            return f;
          });
        })
        .catch(() => {});
    };
    poll();
    const t = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [isPresenter, classId]);

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

  const navigate = useCallback(
    (p: number) => {
      if (!isPresenter) setFollowing(false); // التصفّح اليدوي يوقف المتابعة
      setSel(null);
      setPage(Math.min(totalPages, Math.max(1, p)));
    },
    [isPresenter, totalPages],
  );

  function doJump() {
    const p = Number(jump);
    if (Number.isInteger(p)) navigate(p);
    setJump("");
  }

  const behindTeacher = !isPresenter && teacherPage != null && teacherPage !== page;

  return (
    <div className="space-y-3">
      {/* شريط الحالة */}
      {isPresenter ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-4 py-2 text-sm text-success">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
          </span>
          <span>أنت تعرض الآن (صفحة {toAr(page)}). اضغط أي كلمة لتسجيل خطأ/ملاحظة.</span>
          <PresencePill label="الطالب" online={otherOnline} className="ms-auto" />
        </div>
      ) : teacherPage == null ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/40 bg-gold-subtle/50 px-4 py-2 text-sm">
          <span className="text-muted">⏳ بانتظار أن يبدأ المعلم العرض…</span>
          <PresencePill label="المعلم" online={otherOnline} />
        </div>
      ) : following ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-brand/30 bg-brand-subtle px-4 py-2 text-sm text-brand">
          <span>📖 تتابع المعلم الآن · صفحة {toAr(teacherPage)}.</span>
          <div className="flex items-center gap-2">
            <PresencePill label="المعلم" online={otherOnline} />
            <button type="button" onClick={() => setFollowing(false)} className="text-xs text-muted hover:underline">
              تصفّح بحرّية
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gold/40 bg-gold-subtle/50 px-4 py-2 text-sm">
          <span className="text-muted">
            تتصفّح بحرّية{behindTeacher ? ` · المعلم على صفحة ${toAr(teacherPage!)}` : ""}.
          </span>
          <div className="flex items-center gap-2">
            <PresencePill label="المعلم" online={otherOnline} />
            <button
              type="button"
              onClick={() => { setFollowing(true); if (teacherPage != null) setPage(teacherPage); }}
              className="rounded-full bg-brand px-3 py-1 text-xs font-medium text-white"
            >
              العودة لمتابعة المعلم
            </button>
          </div>
        </div>
      )}

      {/* أدوات التنقّل */}
      <Card className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">السورة</span>
          <Select
            value={words[0]?.surah ?? ""}
            onChange={(e) => {
              const s = surahNav.find((x) => x.number === Number(e.target.value));
              if (s) navigate(s.start_page);
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
              if (j) navigate(j.start_page);
            }}
            className="h-9 w-40"
          >
            {juzNav.map((j) => (
              <option key={j.juz} value={j.juz}>{juzName(j.juz)}</option>
            ))}
          </Select>
        </label>
        <div className="flex flex-wrap items-center gap-2 sm:ms-auto">
          <Button type="button" size="sm" variant="outline" onClick={() => navigate(page + 1)} disabled={page >= totalPages}>← التالي</Button>
          <span className="text-xs text-muted">صفحة {toAr(page)}</span>
          <Button type="button" size="sm" variant="outline" onClick={() => navigate(page - 1)} disabled={page <= 1}>السابق →</Button>
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
                          const mtype = marked.get(wkey(w.surah, w.ayah, w.pos));
                          const isSel = isPresenter && sel && sel.surah === w.surah && sel.ayah === w.ayah && sel.word === w.pos;
                          return (
                            <span
                              key={i}
                              {...(isPresenter
                                ? {
                                    role: "button",
                                    title: "تسجيل خطأ/ملاحظة على هذه الكلمة",
                                    onClick: () => setSel({ surah: w.surah, ayah: w.ayah, word: w.pos, surahName: nameOf(w.surah) }),
                                  }
                                : {})}
                              style={{ fontFamily: `'qcf2-p${w.vpage}'` }}
                              className={[
                                "rounded px-0.5",
                                isPresenter ? "cursor-pointer hover:bg-brand/10" : "",
                                isSel ? "bg-brand/30 ring-1 ring-brand" : "",
                                mtype ? `underline decoration-2 underline-offset-[6px] ${MISTAKE_TYPES[mtype].soft.split(" ")[1]}` : "",
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

      {/* نموذج تسجيل الخطأ — للمعلم فقط عند اختيار كلمة */}
      {isPresenter && sel && (
        <Card className="space-y-3 border-brand/30">
          <div className="flex items-center justify-between">
            <p className="font-display text-base font-bold">
              {sel.surahName} · آية {toAr(sel.ayah)}{sel.word != null ? ` · كلمة ${toAr(sel.word)}` : ""}
            </p>
            <button type="button" onClick={() => setSel(null)} className="text-xs text-muted hover:underline">إلغاء</button>
          </div>
          <form action={addAction} className="space-y-2">
            <input type="hidden" name="student_id" value={studentId} />
            <input type="hidden" name="class_id" value={classId} />
            <input type="hidden" name="surah_number" value={sel.surah} />
            <input type="hidden" name="ayah_number" value={sel.ayah} />
            {sel.word != null && <input type="hidden" name="word_index" value={sel.word} />}
            <div className="grid gap-2 sm:grid-cols-2">
              <Select name="mistake_type" value={mistakeType} onChange={(e) => setMistakeType(e.target.value as MistakeType)} className="h-9">
                {MISTAKE_TYPE_KEYS.map((k) => (
                  <option key={k} value={k}>{MISTAKE_TYPES[k].label}</option>
                ))}
              </Select>
              <Input name="title" placeholder="عنوان الخطأ" className="h-9" required />
            </div>
            <Textarea name="note" placeholder="ملاحظة قصيرة (اختياري)" className="min-h-16" />
            {addState.error && <p className="text-sm text-danger">{addState.error}</p>}
            <Button type="submit" size="sm" disabled={addPending}>{addPending ? "إضافة…" : "تسجيل الخطأ"}</Button>
          </form>
        </Card>
      )}
    </div>
  );
}
