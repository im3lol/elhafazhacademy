import { sql } from "@/lib/db";

/** مفتاح إعداد بيانات تحويل/دفع الأكاديمية (يظهر للطالب). */
export const ACADEMY_PAYMENT_KEY = "academy_payment_info";
export type AcademyPayment = {
  method_label: string;
  account_number: string;
  account_holder: string;
  instructions: string;
};

/** يقرأ قيمة إعداد (jsonb). */
export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  const [row] = await sql<{ value: T }[]>`select value from app_settings where key = ${key} limit 1`;
  return row?.value ?? null;
}

/** يحفظ/يحدّث قيمة إعداد. */
export async function setSetting(key: string, value: unknown): Promise<void> {
  await sql`
    insert into app_settings (key, value, updated_at)
    values (${key}, ${sql.json(value as never)}, now())
    on conflict (key) do update set value = excluded.value, updated_at = now()`;
}

/** يحذف إعداداً. */
export async function deleteSetting(key: string): Promise<void> {
  await sql`delete from app_settings where key = ${key}`;
}
