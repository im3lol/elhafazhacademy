// إنشاء/تحديث حساب أدمن — للطوارئ واستعادة الوصول.
// المسار الطبيعي لأول حساب هو صفحة /setup في المتصفح.
//
// التشغيل:
//   node scripts/seed-admin.mjs <البريد> <كلمة المرور> ["الاسم الكامل"]
//   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-admin.mjs
import bcrypt from "bcryptjs";
import { connect } from "./_env.mjs";

const EMAIL = process.argv[2] || process.env.ADMIN_EMAIL;
const PASSWORD = process.argv[3] || process.env.ADMIN_PASSWORD;
const FULL_NAME = process.argv[4] || process.env.ADMIN_NAME || "مدير الأكاديمية";

// لا كلمة مرور افتراضية: المستودع عام، وأي قيمة مكتوبة هنا تصبح مفتاحاً لكل نسخة منشورة.
if (!EMAIL || !PASSWORD) {
  console.error("✖ الاستخدام: node scripts/seed-admin.mjs <البريد> <كلمة المرور> [\"الاسم\"]");
  process.exit(1);
}
if (PASSWORD.length < 8) {
  console.error("✖ كلمة المرور قصيرة — ٨ أحرف على الأقل.");
  process.exit(1);
}

const sql = connect();
const hash = await bcrypt.hash(PASSWORD, 10);

const [user] = await sql`
  insert into users (email, password_hash, user_type, status)
  values (${EMAIL}, ${hash}, 'admin', 'active')
  on conflict (email) do update set password_hash = excluded.password_hash, user_type = 'admin'
  returning id`;

const [role] = await sql`select id from roles where name = 'super_admin' limit 1`;

await sql`
  insert into admin_users (user_id, full_name, role_id, status)
  values (${user.id}, ${FULL_NAME}, ${role?.id ?? null}, 'Active')
  on conflict (user_id) do update set role_id = excluded.role_id, status = 'Active'`;

console.log("✅ حساب الأدمن جاهز:", EMAIL);

await sql.end();
