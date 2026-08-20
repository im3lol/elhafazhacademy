// تحميل متغيّرات البيئة من .env.local قبل الاختبارات (للاختبارات التي تمسّ قاعدة البيانات).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
try {
  const content = readFileSync(path.join(dir, "..", ".env.local"), "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // لا يوجد .env.local — اختبارات الوحدة البحتة ستعمل
}

/**
 * حاجز أمان: اختبارات التكامل تُنشئ وتحذف صفوفاً حقيقية (vitest-*@test.local).
 * `.env.local` يشير إلى قاعدة الإنتاج، فتوريثها هنا يعني كتابة اختبارات في الإنتاج.
 * لذلك تُقطع الوراثة دائماً: قاعدة الاختبارات تأتي حصراً من TEST_DATABASE_URL.
 */
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";
delete process.env.POSTGRES_URL;
delete process.env.POSTGRES_URL_NON_POOLING;

if (!process.env.TEST_DATABASE_URL) {
  console.warn(
    "⚠️ TEST_DATABASE_URL غير مضبوط — اختبارات التكامل ستفشل بخطأ اتصال (وهذا مقصود).\n" +
      "   شغّل اختبارات الوحدة بـ `npm test`، أو اضبط TEST_DATABASE_URL على قاعدة محلية لـ `npm run test:db`.",
  );
}
