import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** دمج أصناف Tailwind بأمان. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** رقم بالأرقام العربية (الفارغ يُعامَل صفراً). */
export function arNum(n: number | string | null | undefined) {
  return Number(n ?? 0).toLocaleString("ar-EG");
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * كل المفاتيح في القاعدة uuid: تمرير نصّ غير صالح يرمي 22P02 من Postgres،
 * فتظهر صفحة ٥٠٠ (أو نصّ خطأ إنجليزي في الواجهة) بدل ٤٠٤ أو رسالة عربية.
 */
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}
