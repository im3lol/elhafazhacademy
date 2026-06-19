import postgres from "postgres";

/**
 * عميل Postgres مباشر (postgres.js) — اتصال مجمّع وسريع.
 * يُعاد استخدامه عبر hot-reload في التطوير.
 */
const globalForDb = globalThis as unknown as { sql?: ReturnType<typeof postgres> };

export const sql =
  globalForDb.sql ??
  postgres(process.env.DATABASE_URL!, {
    max: 10,
    idle_timeout: 20,
    prepare: true,
  });

if (process.env.NODE_ENV !== "production") globalForDb.sql = sql;
