"use client";

import { useActionState, useMemo, useState } from "react";
import { recordLessonReport, type ReportState } from "@/lib/teacher/report-actions";
import { computeOverall } from "@/lib/validators/report";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { MushafRangePicker, type RangeValue } from "@/components/mushaf/mushaf-range-picker";
import type { JuzNav, SurahNav } from "@/lib/mushaf/data";

type Mistake = {
  category: "memorization" | "tajweed" | "pronunciation";
  type: string;
  surah_name: string;
  ayah_number: string;
  severity: "low" | "medium" | "high";
  description: string;
};

const catLabel = { memorization: "حفظ", tajweed: "تجويد", pronunciation: "نطق" };
const sevLabel = { low: "منخفض", medium: "متوسط", high: "عالٍ" };

export function LessonReportForm({
  classId,
  studentName,
  surahNav,
  juzNav,
  totalPages,
  initialPage,
  initialMistakes,
}: {
  classId: string;
  studentName: string;
  surahNav: SurahNav[];
  juzNav: JuzNav[];
  totalPages: number;
  initialPage: number;
  /** أخطاء مسجَّلة مسبقاً في المصحف المباشر لهذه الحصة — تظهر تلقائياً في القائمة. */
  initialMistakes?: Mistake[];
}) {
  const [state, formAction] = useActionState<ReportState, FormData>(recordLessonReport, {});
  const [attended, setAttended] = useState(true);
  const [scores, setScores] = useState({ m: 80, t: 80, f: 80, c: 80 });
  const [mistakes, setMistakes] = useState<Mistake[]>(initialMistakes ?? []);
  const [range, setRange] = useState<RangeValue>({
    surahNumber: null,
    surahName: "",
    ayahFrom: null,
    ayahTo: null,
  });
  const e = state.fieldErrors ?? {};

  const overall = useMemo(
    () => computeOverall(scores.m, scores.t, scores.f, scores.c),
    [scores],
  );

  const serializedMistakes = useMemo(
    () =>
      JSON.stringify(
        mistakes.map((m) => ({
          category: m.category,
          type: m.type,
          surah_name: m.surah_name || null,
          ayah_number: m.ayah_number ? Number(m.ayah_number) : null,
          severity: m.severity,
          description: m.description || null,
        })),
      ),
    [mistakes],
  );

  // إضافة خطأ من المصحف (كليك يمين على كلمة) — يملأ السورة والآية والتصنيف تلقائياً
  function addMistakeFromMushaf(m: { surahName: string; ayah: number; category: Mistake["category"] }) {
    setMistakes((p) => [
      ...p,
      { category: m.category, type: "", surah_name: m.surahName, ayah_number: String(m.ayah), severity: "medium", description: "" },
    ]);
  }

  function addMistake() {
    setMistakes((p) => [
      ...p,
      { category: "tajweed", type: "", surah_name: "", ayah_number: "", severity: "medium", description: "" },
    ]);
  }
  function updateMistake(i: number, patch: Partial<Mistake>) {
    setMistakes((p) => p.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));
  }
  function removeMistake(i: number) {
    setMistakes((p) => p.filter((_, idx) => idx !== i));
  }

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="class_id" value={classId} />
      <input type="hidden" name="attended" value={String(attended)} />
      <input type="hidden" name="mistakes" value={serializedMistakes} />

      {state.error && <FormMessage>{state.error}</FormMessage>}

      {/* الحضور */}
      <Card>
        <h2 className="mb-3 font-display text-lg font-bold">الحضور</h2>
        <div className="flex gap-3">
          <button type="button" onClick={() => setAttended(true)}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium ${attended ? "border-brand bg-brand-subtle text-brand" : "border-border"}`}>
            حضر الطالب
          </button>
          <button type="button" onClick={() => setAttended(false)}
            className={`flex-1 rounded-xl border px-4 py-3 text-sm font-medium ${!attended ? "border-danger bg-danger/10 text-danger" : "border-border"}`}>
            لم يحضر
          </button>
        </div>
      </Card>

      {attended && (
        <>
          {/* الدرس */}
          <Card className="space-y-4">
            <h2 className="font-display text-lg font-bold">تفاصيل الدرس</h2>
            <Field label="نوع الحصة" htmlFor="lesson_type" error={e.lesson_type} required>
              <Select id="lesson_type" name="lesson_type" defaultValue="memorization">
                <option value="memorization">حفظ</option>
                <option value="revision">مراجعة</option>
                <option value="tajweed">تجويد</option>
                <option value="test">اختبار</option>
              </Select>
            </Field>

            <div>
              <p className="mb-2 text-sm font-medium">حدّد المقطع المُدرَّس على المصحف</p>
              <MushafRangePicker
                surahNav={surahNav}
                juzNav={juzNav}
                totalPages={totalPages}
                initialPage={initialPage}
                value={range}
                onChange={setRange}
                onAddMistake={addMistakeFromMushaf}
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="السورة" htmlFor="surah_name" error={e.surah_name}>
                <Input
                  id="surah_name" name="surah_name" placeholder="البقرة"
                  value={range.surahName}
                  onChange={(ev) => setRange((r) => ({ ...r, surahName: ev.target.value }))}
                />
              </Field>
              <Field label="من آية" htmlFor="ayah_from" error={e.ayah_from}>
                <Input
                  id="ayah_from" name="ayah_from" type="number" min={1} dir="ltr"
                  value={range.ayahFrom ?? ""}
                  onChange={(ev) => setRange((r) => ({ ...r, ayahFrom: ev.target.value ? Number(ev.target.value) : null }))}
                />
              </Field>
              <Field label="إلى آية" htmlFor="ayah_to" error={e.ayah_to}>
                <Input
                  id="ayah_to" name="ayah_to" type="number" min={1} dir="ltr"
                  value={range.ayahTo ?? ""}
                  onChange={(ev) => setRange((r) => ({ ...r, ayahTo: ev.target.value ? Number(ev.target.value) : null }))}
                />
              </Field>
            </div>
          </Card>

          {/* التقييم */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">التقييم</h2>
              <span className="rounded-full bg-brand-subtle px-3 py-1 text-sm font-bold text-brand">
                التقييم العام: {overall}٪
              </span>
            </div>
            {([
              ["memorization_score", "الحفظ (٤٠٪)", "m"],
              ["tajweed_score", "التجويد (٣٠٪)", "t"],
              ["fluency_score", "الطلاقة (٢٠٪)", "f"],
              ["commitment_score", "الالتزام (١٠٪)", "c"],
            ] as const).map(([name, label, key]) => (
              <div key={name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="font-bold">{scores[key]}٪</span>
                </div>
                <input
                  type="range" name={name} min={0} max={100} value={scores[key]}
                  onChange={(ev) => setScores((s) => ({ ...s, [key]: Number(ev.target.value) }))}
                  className="w-full accent-[var(--brand)]"
                />
              </div>
            ))}
          </Card>

          {/* الأخطاء */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">الأخطاء</h2>
              <Button type="button" size="sm" variant="outline" onClick={addMistake}>+ خطأ</Button>
            </div>
            {initialMistakes && initialMistakes.length > 0 && (
              <p className="rounded-lg bg-brand-subtle px-3 py-1.5 text-xs text-brand">
                أُدرجت {initialMistakes.length.toLocaleString("ar-EG")} أخطاء سُجّلت في المصحف المباشر أثناء الحصة — راجعها أو عدّلها قبل الحفظ.
              </p>
            )}
            {mistakes.length === 0 && <p className="text-sm text-muted">لا أخطاء مسجّلة.</p>}
            {mistakes.map((m, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 rounded-xl border border-border p-3 sm:grid-cols-6">
                <Select value={m.category} onChange={(ev) => updateMistake(i, { category: ev.target.value as Mistake["category"] })}>
                  {Object.entries(catLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
                <Input placeholder="النوع" value={m.type} onChange={(ev) => updateMistake(i, { type: ev.target.value })} />
                <Input placeholder="السورة" value={m.surah_name} onChange={(ev) => updateMistake(i, { surah_name: ev.target.value })} />
                <Input placeholder="الآية" type="number" dir="ltr" value={m.ayah_number} onChange={(ev) => updateMistake(i, { ayah_number: ev.target.value })} />
                <Select value={m.severity} onChange={(ev) => updateMistake(i, { severity: ev.target.value as Mistake["severity"] })}>
                  {Object.entries(sevLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </Select>
                <Button type="button" variant="ghost" size="sm" onClick={() => removeMistake(i)}>حذف</Button>
              </div>
            ))}
          </Card>

          {/* ملاحظات وواجب */}
          <Card className="space-y-4">
            <Field label="ملاحظات المعلم" htmlFor="teacher_notes" error={e.teacher_notes}>
              <Textarea id="teacher_notes" name="teacher_notes" placeholder="ملاحظات عامة عن أداء الطالب…" />
            </Field>
            <Field label="واجب الحصة القادمة" htmlFor="homework" error={e.homework}>
              <Textarea id="homework" name="homework" placeholder="ما المطلوب تحضيره…" />
            </Field>
          </Card>
        </>
      )}

      <div className="flex gap-2">
        <SubmitButton size="lg" pendingText="جارٍ الحفظ…">
          {attended ? "حفظ التقرير" : "تسجيل الغياب"}
        </SubmitButton>
      </div>
      <p className="text-xs text-muted">الطالب: {studentName}</p>
    </form>
  );
}
