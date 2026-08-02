"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * حدّ أخطاء عام: بدونه يعرض Next صفحة "Application error" الإنجليزية الفارغة
 * لأي throw في صفحة أو إجراء (مثل رمي حارس الصلاحيات).
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error.digest ?? "", error.message);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <h1 className="font-display text-2xl font-bold">حدث خطأ غير متوقع</h1>
      <p className="max-w-md text-sm text-muted">
        تعذّر إتمام العملية. حاول مجدداً، وإن تكرر الأمر فراجع الإدارة.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
        >
          إعادة المحاولة
        </button>
        <Link
          href="/"
          className="rounded-xl border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-surface"
        >
          الصفحة الرئيسية
        </Link>
      </div>
      {error.digest && <p className="text-xs text-muted">رمز الخطأ: {error.digest}</p>}
    </div>
  );
}
