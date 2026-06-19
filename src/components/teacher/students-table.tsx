"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";

const statusLabel: Record<string, string> = {
  Active: "نشط",
  "Pending Payment": "بانتظار الدفع",
  "Payment Under Review": "مراجعة الدفع",
  Suspended: "موقوف",
};
const statusClass: Record<string, string> = {
  Active: "bg-success/15 text-success",
  "Pending Payment": "bg-warning/15 text-warning",
  "Payment Under Review": "bg-info/15 text-info",
  Suspended: "bg-danger/15 text-danger",
};

export type StudentRow = {
  id: string;
  full_name: string;
  country: string | null;
  current_level: string | null;
  status: string;
  package_name: string | null;
  classes_done: number;
  last_overall: number | null;
};

const PAGE = 20;
const toAr = (n: number) => n.toLocaleString("ar-EG");

export function StudentsTable({ students }: { students: StudentRow[] }) {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const pages = Math.max(1, Math.ceil(students.length / PAGE));
  const slice = students.slice((page - 1) * PAGE, page * PAGE);

  return (
    <Card className="space-y-3 overflow-hidden">
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[820px] text-right text-sm">
          <thead>
            <tr className="border-b border-border text-xs text-muted">
              <th className="px-2 py-2 font-medium">الاسم</th>
              <th className="px-2 py-2 font-medium">الدولة</th>
              <th className="px-2 py-2 font-medium">المستوى</th>
              <th className="px-2 py-2 font-medium">الباقة</th>
              <th className="px-2 py-2 font-medium">حصص مكتملة</th>
              <th className="px-2 py-2 font-medium">آخر تقييم</th>
              <th className="px-2 py-2 font-medium">الحالة</th>
              <th className="px-2 py-2 font-medium">المصحف</th>
            </tr>
          </thead>
          <tbody>
            {slice.map((s) => (
              <tr
                key={s.id}
                onClick={() => router.push(`/teacher/students/${s.id}`)}
                className="cursor-pointer border-b border-border hover:bg-surface"
              >
                <td className="px-2 py-2 font-medium">{s.full_name}</td>
                <td className="px-2 py-2">{s.country ?? "—"}</td>
                <td className="px-2 py-2">{s.current_level ?? "—"}</td>
                <td className="px-2 py-2">{s.package_name ?? "—"}</td>
                <td className="px-2 py-2 tabular-nums">{toAr(s.classes_done)}</td>
                <td className="px-2 py-2 tabular-nums font-bold text-brand">{s.last_overall != null ? `${toAr(s.last_overall)}٪` : "—"}</td>
                <td className="px-2 py-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClass[s.status] ?? "bg-surface text-muted"}`}>
                    {statusLabel[s.status] ?? s.status}
                  </span>
                </td>
                <td className="px-2 py-2">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); router.push(`/teacher/students/${s.id}/mushaf`); }}
                    className={buttonClasses({ size: "sm", variant: "outline" })}
                  >
                    📖 فتح المصحف
                  </button>
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
  );
}
