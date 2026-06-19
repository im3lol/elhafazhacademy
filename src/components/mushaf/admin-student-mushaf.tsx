"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { usePageData } from "@/components/mushaf/use-page-data";
import { MushafPageFrame } from "@/components/mushaf/mushaf-page-frame";
import {
  MISTAKE_TYPES,
  juzName,
  type JuzNav,
  type MistakeType,
  type MushafMistake,
  type SurahNav,
} from "@/lib/mushaf/data";

const toAr = (n: number) => n.toLocaleString("ar-EG");
const wkey = (s: number, a: number, w: number | null) => `${s}:${a}:${w ?? ""}`;

/** عارض مصحف الطالب للأدمن — قراءة فقط، مع إبراز الملاحظات المفتوحة وقائمتها. */
export function AdminStudentMushaf({
  surahNav,
  juzNav,
  totalPages,
  initialPage,
  mistakes,
}: {
  surahNav: SurahNav[];
  juzNav: JuzNav[];
  totalPages: number;
  initialPage: number;
  mistakes: MushafMistake[];
}) {
  const [page, setPage] = useState(initialPage);
  const [jump, setJump] = useState("");
  const { data, loading } = usePageData(page);

  const nameOf = (surah: number) => surahNav.find((s) => s.number === surah)?.name_ar ?? `سورة ${surah}`;
  const marked = useMemo(
    () =>
      new Map<string, MistakeType>(
        mistakes.filter((m) => !m.is_resolved).map((m) => [wkey(m.surah_number, m.ayah_number, m.word_index), m.mistake_type]),
      ),
    [mistakes],
  );

  function go(p: number) {
    setPage(Math.min(totalPages, Math.max(1, p)));
  }
  function doJump() {
    const p = Number(jump);
    if (Number.isInteger(p)) go(p);
    setJump("");
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm">
          <span className="text-muted">السورة</span>
          <Select
            value={data.words[0]?.surah ?? ""}
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
            value={data.juz ?? ""}
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

      <MushafPageFrame
        words={data.words}
        surahHeaders={data.surahHeaders}
        juz={data.juz}
        page={page}
        loading={loading}
        nameOf={nameOf}
        marked={marked}
      />

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">ملاحظات المصحف</h2>
        {mistakes.length === 0 ? (
          <Card className="text-sm text-muted">لا ملاحظات على مصحف هذا الطالب.</Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[560px] text-right text-sm">
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="p-3 font-medium">النوع</th>
                  <th className="p-3 font-medium">الموضع</th>
                  <th className="p-3 font-medium">العنوان</th>
                  <th className="p-3 font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {mistakes.map((m) => (
                  <tr key={m.id} className="border-b border-border/60 last:border-0">
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${MISTAKE_TYPES[m.mistake_type].dot}`} />
                        {MISTAKE_TYPES[m.mistake_type].label}
                      </span>
                    </td>
                    <td className="whitespace-nowrap p-3 text-muted">
                      {nameOf(m.surah_number)} · آية {toAr(m.ayah_number)}
                    </td>
                    <td className="p-3">{m.title}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${m.is_resolved ? "bg-success/15 text-success" : "bg-warning/15 text-warning"}`}>
                        {m.is_resolved ? "تم حلّه" : "مفتوح"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
