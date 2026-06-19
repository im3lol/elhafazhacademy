"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { formatClassTime } from "@/lib/class-status";

const earningStatus: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-warning/15 text-warning" },
  approved: { label: "معتمد", cls: "bg-info/15 text-info" },
  paid: { label: "مدفوع", cls: "bg-success/15 text-success" },
};

export type EarningRow = { id: string; amount: string; status: string; created_at: string; student_name: string | null };

const PAGE = 20;
const egp = (v: string | number | null) => `${Number(v ?? 0).toLocaleString("ar-EG")} ج.م`;
const toAr = (n: number) => n.toLocaleString("ar-EG");

export function EarningsTable({ earnings }: { earnings: EarningRow[] }) {
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(earnings.length / PAGE));
  const slice = earnings.slice((page - 1) * PAGE, page * PAGE);

  return (
    <Card className="space-y-3 overflow-hidden">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[520px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-2 py-2 font-medium">الطالب</th>
              <th className="px-2 py-2 font-medium">المبلغ</th>
              <th className="px-2 py-2 font-medium">التاريخ</th>
              <th className="px-2 py-2 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((e) => {
              const st = earningStatus[e.status] ?? { label: e.status, cls: "" };
              return (
                <tr key={e.id} className="border-b border-border">
                  <td className="px-2 py-2 font-medium">{e.student_name ?? "—"}</td>
                  <td className="px-2 py-2 font-bold tabular-nums text-brand">{egp(e.amount)}</td>
                  <td className="whitespace-nowrap px-2 py-2 text-muted" dir="rtl">{formatClassTime(e.created_at)}</td>
                  <td className="px-2 py-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
                  </td>
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
            <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className={`${buttonClasses({ size: "sm", variant: "outline" })} disabled:opacity-40`}>السابق</button>
            <button type="button" onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className={`${buttonClasses({ size: "sm", variant: "outline" })} disabled:opacity-40`}>التالي</button>
          </div>
        </div>
      )}
    </Card>
  );
}
