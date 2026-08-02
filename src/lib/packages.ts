import { sql } from "@/lib/db";

export type ActivePackage = {
  id: string;
  name: string;
  classes_per_month: number | null;
  price: number;
  currency: string;
};

/**
 * الباقات النشطة مع ذاكرة قصيرة داخل العملية.
 * تُقرأ على الصفحة الرئيسية العامة وصفحة التسجيل — أي عند كل زائر مجهول —
 * بينما تتغيّر نادراً جداً. القاعدة بعيدة، فرحلة لكل زائر ثمن بلا مقابل.
 * تُبطَل فوراً عند تعديل الباقات من لوحة الأدمن.
 */
const TTL_MS = 5 * 60_000;
let cache: { at: number; rows: ActivePackage[] } | null = null;

export async function getActivePackages(): Promise<ActivePackage[]> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.rows;
  const rows = await sql<ActivePackage[]>`
    select id, name, classes_per_month, price, currency
    from packages where is_active = true order by price`;
  cache = { at: Date.now(), rows };
  return rows;
}

/** يُستدعى من إجراءات إدارة الباقات كي يظهر التعديل فوراً. */
export function invalidatePackagesCache(): void {
  cache = null;
}
