"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { classStatusLabel, classStatusClass, formatClassTime } from "@/lib/class-status";
import type { ScheduleRow } from "@/components/dashboard/class-schedule";

const PAGE = 20;
const toAr = (n: number) => n.toLocaleString("ar-EG");

export function PastClassesTable({ rows, role }: { rows: ScheduleRow[]; role: "student" | "teacher" }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const slice = rows.slice((page - 1) * PAGE, page * PAGE);
  const namePrefix = role === "student" ? "المعلم" : "الطالب";

  return (
    <Card className="space-y-3 overflow-hidden">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[560px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-2 py-2 font-medium">الموعد</th>
              <th className="px-2 py-2 font-medium">{namePrefix}</th>
              <th className="px-2 py-2 font-medium">الحالة</th>
              <th className="px-2 py-2 font-medium">التقييم</th>
              {role === "teacher" && <th className="px-2 py-2 font-medium">التقرير</th>}
            </tr>
          </thead>
          <tbody>
            {slice.map((c) => {
              const isCompleted = c.status === "completed";
              return (
                <tr key={c.id} className="border-b border-border">
                  <td className="whitespace-nowrap px-2 py-2" dir="rtl">{formatClassTime(c.start_time)}</td>
                  <td className="px-2 py-2">{c.other_name}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classStatusClass[c.status] ?? ""}`}>
                      {classStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-2 py-2 tabular-nums">
                    {isCompleted && c.overall_score != null ? `${toAr(c.overall_score)}٪` : "—"}
                  </td>
                  {role === "teacher" && (
                    <td className="px-2 py-2">
                      <Link href={`/teacher/classes/${c.id}/report`} className={buttonClasses({ size: "sm", variant: "outline" })}>
                        {isCompleted ? "عرض" : "تسجيل"}
                      </Link>
                    </td>
                  )}
                </tr>
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
