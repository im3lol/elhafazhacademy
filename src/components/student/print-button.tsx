"use client";

import { buttonClasses } from "@/components/ui/button";

/** زرّ طباعة/تصدير التقرير عبر حوار الطباعة (لا يظهر في النسخة المطبوعة). */
export function PrintButton({ label = "🖨️ طباعة / PDF" }: { label?: string }) {
  return (
    <button type="button" onClick={() => window.print()} className={`${buttonClasses({ size: "sm", variant: "outline" })} print:hidden`}>
      {label}
    </button>
  );
}
