"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { categoryLabel, statusLabel, statusClass } from "@/lib/complaints/config";

export type ComplaintRow = {
  id: string;
  category: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  creator_name?: string | null;
};

const PAGE = 20;
const toAr = (n: number) => n.toLocaleString("ar-EG");
function fmtDate(s: string) {
  try {
    return new Date(s).toLocaleDateString("ar-EG-u-nu-arab", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return s;
  }
}

export function ComplaintsList({
  complaints,
  basePath,
  showCreator = false,
}: {
  complaints: ComplaintRow[];
  basePath: string;
  showCreator?: boolean;
}) {
  const router = useRouter();
  const [page, setPage] = useState(1);

  if (complaints.length === 0) {
    return <Card className="text-sm text-muted">لا توجد تذاكر بعد.</Card>;
  }

  // تحليل بسيط
  const counts: Record<string, number> = {};
  for (const c of complaints) counts[c.status] = (counts[c.status] ?? 0) + 1;
  const total = complaints.length;
  const active = (counts["Open"] ?? 0) + (counts["In Progress"] ?? 0) + (counts["Waiting For User"] ?? 0);
  const done = (counts["Resolved"] ?? 0) + (counts["Closed"] ?? 0);
  const kpis = [
    { label: "إجمالي التذاكر", value: total },
    { label: "مفتوحة", value: counts["Open"] ?? 0 },
    { label: "قيد المعالجة", value: active - (counts["Open"] ?? 0) },
    { label: "منتهية", value: done },
  ];

  const pages = Math.max(1, Math.ceil(complaints.length / PAGE));
  const slice = complaints.slice((page - 1) * PAGE, page * PAGE);

  return (
    <div className="space-y-4">
      {/* تحليل بسيط */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-muted">{k.label}</p>
            <p className="mt-1 font-display text-2xl font-black tabular-nums text-brand">{toAr(k.value)}</p>
          </Card>
        ))}
      </div>

      {/* جدول التذاكر */}
      <Card className="space-y-3 overflow-hidden">
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[560px] text-right text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted">
                <th className="px-2 py-2 font-medium">الموضوع</th>
                <th className="px-2 py-2 font-medium">التصنيف</th>
                {showCreator && <th className="px-2 py-2 font-medium">المُرسِل</th>}
                <th className="px-2 py-2 font-medium">التاريخ</th>
                <th className="px-2 py-2 font-medium">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`${basePath}/complaints/${c.id}`)}
                  className="cursor-pointer border-b border-border hover:bg-surface"
                >
                  <td className="px-2 py-2 font-medium">{c.subject ?? "—"}</td>
                  <td className="px-2 py-2">{categoryLabel[c.category ?? ""] ?? c.category ?? "—"}</td>
                  {showCreator && <td className="px-2 py-2">{c.creator_name ?? "—"}</td>}
                  <td className="whitespace-nowrap px-2 py-2" dir="rtl">{fmtDate(c.created_at)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[c.status] ?? ""}`}>
                      {statusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pages > 1 && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-muted">صفحة {toAr(page)} من {toAr(pages)}</span>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={`${buttonClasses({ size: "sm", variant: "outline" })} disabled:opacity-40`}>السابق</button>
              <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={`${buttonClasses({ size: "sm", variant: "outline" })} disabled:opacity-40`}>التالي</button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
