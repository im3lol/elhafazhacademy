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
  // لا يوجد .env.local — اختبارات الوحدة البحتة ستعمل، واختبارات DB ستُتخطّى
}
