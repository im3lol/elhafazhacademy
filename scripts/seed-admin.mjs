// إنشاء/تحديث حساب أدمن. التشغيل: node scripts/seed-admin.mjs
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const env = process.env.DATABASE_URL
  ? { DATABASE_URL: process.env.DATABASE_URL }
  : Object.fromEntries(
      readFileSync(new URL("../.env.local", import.meta.url), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );

const sql = postgres(env.DATABASE_URL, { max: 1 });

const EMAIL = "admin@elhafazah.test";
const PASSWORD = "admin1234";
const FULL_NAME = "مدير الأكاديمية";

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

console.log("✅ حساب الأدمن جاهز:");
console.log("   البريد:", EMAIL);
console.log("   كلمة المرور:", PASSWORD);

await sql.end();
