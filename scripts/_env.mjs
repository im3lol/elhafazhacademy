// قراءة سلسلة اتصال Postgres وفتح عميل — مشترك بين كل السكربتات.
// تكامل Supabase على Vercel يحقن POSTGRES_URL (مُجمَّع) و
// POSTGRES_URL_NON_POOLING (مباشر) ولا يحقن DATABASE_URL — لذلك نقبل الثلاثة.
import postgres from "postgres";
import { readFileSync } from "node:fs";

function fromEnvFile() {
  try {
    return Object.fromEntries(
      readFileSync(new URL("../.env.local", import.meta.url), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );
  } catch {
    return {}; // لا ملف .env.local — نعتمد على البيئة وحدها (Vercel/Docker)
  }
}

/**
 * مجمّع Supabase في وضع transaction (منفذ 6543) لا يدعم العبارات المحضّرة:
 * الاتصال يُعاد استخدامه بين المعاملات فتضيع العبارة المحضّرة على اتصال آخر.
 */
export const isPooler = (url) => /pooler\.supabase\.com|:6543/.test(url ?? "");

/** @param {boolean} direct فضّل الاتصال المباشر (5432) — للـ DDL والبذر الطويل */
export function dbUrl(direct = false) {
  const file = fromEnvFile();
  const keys = direct
    ? ["POSTGRES_URL_NON_POOLING", "DATABASE_URL", "POSTGRES_URL"]
    : ["DATABASE_URL", "POSTGRES_URL", "POSTGRES_URL_NON_POOLING"];
  for (const k of keys) {
    const v = process.env[k] || file[k];
    if (v) return v;
  }
  return undefined;
}

/** عميل جاهز. يفشل برسالة واضحة بدل انهيار غامض إن لم توجد سلسلة اتصال. */
export function connect({ direct = false, max = 1 } = {}) {
  const url = dbUrl(direct);
  if (!url) {
    console.error("✖ لا توجد سلسلة اتصال — اضبط DATABASE_URL أو أنشئ .env.local");
    process.exit(1);
  }
  return postgres(url, { max, prepare: !isPooler(url) });
}
