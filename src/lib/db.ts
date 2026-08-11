import postgres from "postgres";

/**
 * عميل Postgres مباشر (postgres.js) — اتصال مجمّع وسريع.
 * يُعاد استخدامه عبر hot-reload في التطوير.
 */
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

/**
 * سلسلة الاتصال: تكامل Supabase على Vercel يحقن `POSTGRES_URL` (مُجمَّع)
 * و`POSTGRES_URL_NON_POOLING` (مباشر) ولا يحقن `DATABASE_URL` — فتُقبل الثلاثة
 * كي يعمل النشر الذاتي بلا ضبط يدوي لأي متغيّر.
 */
const url =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

/**
 * مجمّع Supabase في وضع transaction (منفذ 6543) لا يدعم العبارات المحضّرة:
 * الاتصال يُعاد استخدامه بين المعاملات فتضيع العبارة المحضّرة على اتصال آخر.
 * تركها مفعّلة يُسقط الاستعلامات بخطأ "prepared statement does not exist".
 */
const usingPooler = /pooler\.supabase\.com|:6543/.test(url);

export const sql =
  globalForDb.sql ??
  postgres(url, {
    max: 10,
    idle_timeout: 20,
    prepare: !usingPooler,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;

/** وصف الاتصال للعرض في لوحة الإدارة — بلا كلمة المرور إطلاقاً. */
export function dbInfo(): { host: string; port: string; database: string; pooled: boolean } {
  try {
    const u = new URL(url);
    return {
      host: u.hostname,
      port: u.port || "5432",
      database: u.pathname.replace(/^\//, "") || "—",
      pooled: usingPooler,
    };
  } catch {
    return { host: "—", port: "—", database: "—", pooled: usingPooler };
  }
}
