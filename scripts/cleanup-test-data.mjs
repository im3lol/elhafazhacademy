// تنظيف بيانات الاختبار المُدخلة أثناء التحقق.
// التشغيل: node scripts/cleanup-test-data.mjs
// يحذف: الإشعارات التجريبية، تقارير/أخطاء سارة المُضافة يدوياً، ورسائل الشكوى التجريبية.
// لا يلمس: حسابات المستخدمين، الحصص، الباقات، أو ربط Google.
import postgres from "postgres";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const sql = postgres(env.DATABASE_URL, { max: 1 });

const SARA = "sara.student@test.com";

const [student] = await sql`
  select s.id from students s join users u on u.id = s.user_id where u.email = ${SARA} limit 1`;

let reports = 0;
let mistakes = 0;
let notifs = 0;

if (student) {
  // التقارير المُدخلة يدوياً (سورة البقرة بتواريخ الاختبار) والأخطاء التجريبية
  const r = await sql`
    delete from lesson_reports
    where student_id = ${student.id} and surah_name = 'البقرة' and lesson_type = 'memorization'`;
  reports = r.count;
  const m = await sql`
    delete from student_mistakes
    where student_id = ${student.id} and surah_name = 'البقرة'`;
  mistakes = m.count;
}

// الإشعارات التجريبية داخل التطبيق
const n = await sql`delete from notifications where channel = 'app'`;
notifs = n.count;

// إلغاء أي ربط تيليجرام تجريبي (لا يلمس إعداد البوت الحقيقي)
await sql`update users set telegram_link_code = null where telegram_chat_id is null`;

console.log("🧹 تم التنظيف:");
console.log("   تقارير الحصص:", reports);
console.log("   الأخطاء:", mistakes);
console.log("   الإشعارات:", notifs);
console.log("\nملاحظة: كلمات مرور sara/teacher1 ما زالت 'test1234'.");
console.log("لإعادة تعيينها أعد تشغيل seed-admin أو غيّرها يدوياً.");

await sql.end();
