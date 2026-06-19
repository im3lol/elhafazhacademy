"use client";

import { Fragment, useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

const lessonType: Record<string, string> = {
  memorization: "حفظ",
  revision: "مراجعة",
  tajweed: "تجويد",
  test: "اختبار",
};

export type LessonRow = {
  id: string;
  created_at: string;
  lesson_type: string | null;
  surah_name: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  memorization_score: number | null;
  tajweed_score: number | null;
  fluency_score: number | null;
  commitment_score: number | null;
  overall_score: number | null;
  teacher_notes: string | null;
  homework: string | null;
};

const PAGE = 20;
const toAr = (n: number | null) => (n == null ? "—" : n.toLocaleString("ar-EG"));
function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("ar-EG-u-nu-arab", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return s;
  }
}

export function LessonsTable({ reports }: { reports: LessonRow[] }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(reports.length / PAGE));
  const slice = reports.slice((page - 1) * PAGE, page * PAGE);

  return (
    <Card className="space-y-3 overflow-hidden">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-2 py-2 font-medium">التاريخ</th>
              <th className="px-2 py-2 font-medium">النوع</th>
              <th className="px-2 py-2 font-medium">الموضع</th>
              <th className="px-2 py-2 font-medium">الحفظ</th>
              <th className="px-2 py-2 font-medium">التجويد</th>
              <th className="px-2 py-2 font-medium">الطلاقة</th>
              <th className="px-2 py-2 font-medium">الالتزام</th>
              <th className="px-2 py-2 font-medium">العام</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((r) => {
              const hasDetail = !!(r.teacher_notes || r.homework);
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => hasDetail && setOpen(open === r.id ? null : r.id)}
                    className={`border-b border-border ${hasDetail ? "cursor-pointer hover:bg-surface" : ""}`}
                  >
                    <td className="whitespace-nowrap px-2 py-2" dir="rtl">{fmtDate(r.created_at)}</td>
                    <td className="px-2 py-2">{lessonType[r.lesson_type ?? ""] ?? "حصة"}</td>
                    <td className="px-2 py-2">
                      {r.surah_name ?? "—"}
                      {r.ayah_from && r.ayah_to ? ` (${toAr(r.ayah_from)}–${toAr(r.ayah_to)})` : ""}
                    </td>
                    <td className="px-2 py-2 tabular-nums">{toAr(r.memorization_score)}</td>
                    <td className="px-2 py-2 tabular-nums">{toAr(r.tajweed_score)}</td>
                    <td className="px-2 py-2 tabular-nums">{toAr(r.fluency_score)}</td>
                    <td className="px-2 py-2 tabular-nums">{toAr(r.commitment_score)}</td>
                    <td className="px-2 py-2 font-bold tabular-nums text-brand">{toAr(r.overall_score)}٪</td>
                  </tr>
                  {hasDetail && open === r.id && (
                    <tr className="border-b border-border bg-surface/60">
                      <td colSpan={8} className="space-y-1 px-3 py-2">
                        {r.teacher_notes && (
                          <p className="text-sm"><span className="text-muted">ملاحظات: </span>{r.teacher_notes}</p>
                        )}
                        {r.homework && (
                          <p className="text-sm"><span className="text-muted">الواجب: </span>{r.homework}</p>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">صفحة {toAr(page)} من {toAr(pages)}</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`${buttonClasses({ size: "sm", variant: "outline" })} disabled:opacity-40`}
            >
              السابق
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page >= pages}
              className={`${buttonClasses({ size: "sm", variant: "outline" })} disabled:opacity-40`}
            >
              التالي
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
