"use client";

import { Fragment, useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { MISTAKE_TYPES, type MistakeType } from "@/lib/mushaf/data";

export type MistakeRow = {
  id: string;
  surah_name: string;
  surah_number: number;
  ayah_number: number;
  word_index: number | null;
  mistake_type: MistakeType;
  title: string;
  note: string | null;
  is_resolved: boolean;
  ayah_text: string | null;
};

const PAGE = 20;
const toAr = (n: number) => n.toLocaleString("ar-EG");
const QURAN_FONT = "'Amiri', 'Scheherazade New', 'Traditional Arabic', serif";

export function MistakesTable({ mistakes }: { mistakes: MistakeRow[] }) {
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(mistakes.length / PAGE));
  const slice = mistakes.slice((page - 1) * PAGE, page * PAGE);

  return (
    <Card className="space-y-3 overflow-hidden">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[560px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-2 py-2 font-medium">النوع</th>
              <th className="px-2 py-2 font-medium">الموضع</th>
              <th className="px-2 py-2 font-medium">الملاحظة</th>
              <th className="px-2 py-2 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((m) => {
              const meta = MISTAKE_TYPES[m.mistake_type];
              const words = (m.ayah_text ?? "").split(/\s+/).filter(Boolean);
              return (
                <Fragment key={m.id}>
                  <tr
                    onClick={() => setOpen(open === m.id ? null : m.id)}
                    className={`border-b border-border cursor-pointer hover:bg-surface ${m.is_resolved ? "opacity-60" : ""}`}
                  >
                    <td className="px-2 py-2">
                      <span className="inline-flex items-center gap-1.5">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`} />
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.soft}`}>{meta.label}</span>
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-2 py-2">
                      {m.surah_name} · آية {toAr(m.ayah_number)}
                      {m.word_index != null ? ` · كلمة ${toAr(m.word_index)}` : ""}
                    </td>
                    <td className="px-2 py-2">{m.title}</td>
                    <td className="px-2 py-2">
                      {m.is_resolved ? (
                        <span className="rounded-full bg-success/15 px-2 py-0.5 text-xs text-success">تم حلّه</span>
                      ) : (
                        <span className="rounded-full bg-warning/15 px-2 py-0.5 text-xs text-warning">مفتوح</span>
                      )}
                    </td>
                  </tr>
                  {open === m.id && (
                    <tr className="border-b border-border bg-surface/60">
                      <td colSpan={4} className="space-y-3 px-3 py-4">
                        {/* الآية كاملة مع تمييز موضع الخطأ */}
                        {words.length > 0 ? (
                          <p className="text-center text-2xl leading-[2.4]" dir="rtl" style={{ fontFamily: QURAN_FONT }}>
                            {words.map((w, i) => {
                              const isErr = m.word_index != null && i + 1 === m.word_index;
                              return (
                                <span key={i} className={isErr ? `rounded px-1 underline decoration-2 underline-offset-8 ${meta.soft}` : ""}>
                                  {w}{" "}
                                </span>
                              );
                            })}
                          </p>
                        ) : (
                          <p className="text-center text-sm text-muted">نص الآية غير متوفّر.</p>
                        )}
                        <div className="text-sm">
                          <p>
                            <span className="text-muted">الخطأ: </span>
                            <span className="font-medium">{m.title}</span>
                          </p>
                          {m.note && <p className="mt-1"><span className="text-muted">ملاحظة المعلم: </span>{m.note}</p>}
                        </div>
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
