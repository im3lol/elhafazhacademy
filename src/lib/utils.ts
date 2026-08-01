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
