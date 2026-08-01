import postgres from "postgres";

/**
 * عميل Postgres مباشر (postgres.js) — اتصال مجمّع وسريع.
 * يُعاد استخدامه عبر hot-reload في التطوير.
 */
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

/**
 * مجمّع Supabase في وضع transaction (منفذ 6543) لا يدعم العبارات المحضّرة:
 * الاتصال يُعاد استخدامه بين المعاملات فتضيع العبارة المحضّرة على اتصال آخر.
 * تركها مفعّلة يُسقط الاستعلامات بخطأ "prepared statement does not exist".
 */
const usingPooler = /pooler\.supabase\.com|:6543/.test(process.env.DATABASE_URL ?? "");

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    prepare: !usingPooler,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
