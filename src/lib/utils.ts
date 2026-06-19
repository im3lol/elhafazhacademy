import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** دمج أصناف Tailwind بأمان. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
