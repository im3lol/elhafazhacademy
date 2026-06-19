// نسخة احتياطية لقاعدة بيانات Postgres (Docker). التشغيل: node scripts/backup.mjs
// تُحفظ في backups/elhafazah-<timestamp>.sql
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const CONTAINER = process.env.DB_CONTAINER ?? "elhafazah_db";
const DB = process.env.DB_NAME ?? "elhafazah";
const USER = process.env.DB_USER ?? "postgres";

const ts = new Date().toISOString().replace(/[:.]/g, "-");
mkdirSync("backups", { recursive: true });
const out = `backups/elhafazah-${ts}.sql`;

try {
  const dump = execSync(`docker exec ${CONTAINER} pg_dump -U ${USER} ${DB}`, {
    maxBuffer: 1024 * 1024 * 512,
  });
  writeFileSync(out, dump);
  console.log(`✅ تم إنشاء النسخة الاحتياطية: ${out} (${(dump.length / 1024).toFixed(1)} KB)`);
} catch (e) {
  console.error("❌ فشل النسخ الاحتياطي. تأكد أن حاوية Docker تعمل:", CONTAINER);
  console.error(e.message);
  process.exit(1);
}
