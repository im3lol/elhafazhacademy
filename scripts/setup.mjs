// تهيئة قاعدة البيانات: المخطط + الأدوار والباقات + بذرة القرآن.
// آمن للتكرار — بعد أول تشغيل يصبح استعلامَين رخيصين ثم ينتهي.
//
// يعمل ضمن `npm run build` فتُهيَّأ نسخة كل أكاديمية تلقائياً عند أول نشر،
// حيث لا مهلة serverless تحدّ من بذر ٨٣٬٦٦٥ كلمة.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { dbUrl, isPooler } from "./_env.mjs";

// الاتصال المباشر (5432) مفضَّل للـ DDL والبذر: المجمّع في وضع transaction
// يعيد استخدام الاتصالات فتضيع أقفال الجلسة والعبارات المحضّرة.
const url = dbUrl(true);
if (!url) {
  console.log("ℹ️ لا توجد سلسلة اتصال — تخطّي التهيئة (البناء يكمل عادياً).");
  process.exit(0);
}

// ملفات القيود والفهارس كلها `if not exists` — إشعارات «already exists» متوقَّعة وتُغرق سجل البناء
const sql = postgres(url, { max: 1, prepare: !isPooler(url), onnotice: () => {} });
const LOCK = 728103; // مفتاح ثابت — يمنع تسابق نشرتين متزامنتين على إنشاء الجداول
const apply = (name) => sql.file(new URL(`../db/init/${name}`, import.meta.url)).simple();
let failed = null;

try {
  await sql`select pg_advisory_lock(${LOCK})`;

  const [{ ready }] = await sql`select to_regclass('public.users') is not null as ready`;
  if (ready) {
    console.log("ℹ️ المخطط موجود — تخطّي الإنشاء.");
  } else {
    // 01_schema.sql فيه `create table` بلا `if not exists` — لا يُطبَّق إلا على قاعدة فارغة
    for (const f of ["01_schema.sql", "02_seed.sql", "03_app_settings.sql"]) {
      await apply(f);
      console.log(`✅ ${f}`);
    }
  }

  // هذان idempotent — يُطبَّقان دائماً كي تلحق القواعد القائمة أي إضافات لاحقة
  for (const f of ["04_constraints.sql", "05_indexes.sql"]) {
    await apply(f);
    console.log(`✅ ${f}`);
  }
} catch (e) {
  failed = e;
} finally {
  // إغلاق الجلسة يحرّر قفل الاستشارة تلقائياً
  await sql.end({ timeout: 5 });
}

if (failed) {
  console.error("✖ فشلت تهيئة المخطط:", failed.message);
  process.exit(1);
}

// البذور: سكربتات قائمة، كلٌّ منها يتخطّى نفسه إن كانت بياناته موجودة.
// تُمرَّر السلسلة صراحةً كي يستخدم الأبناء نفس الاتصال المباشر.
for (const s of ["seed-quran.mjs", "seed-quran-layout.mjs"]) {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(s, import.meta.url))], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
  if (r.status !== 0) {
    console.error(`✖ فشل ${s}`);
    process.exit(r.status ?? 1);
  }
}

console.log("✅ القاعدة جاهزة. أنشئ أول حساب أدمن من صفحة /setup.");
