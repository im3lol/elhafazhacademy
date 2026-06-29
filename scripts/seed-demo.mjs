// بيانات تجريبية للعرض/التعلّم: حساب معلم وحساب طالب (مفعّلان ومربوطان).
// التشغيل: node scripts/seed-demo.mjs   — idempotent (آمن للتكرار)
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
const PASSWORD = "demo1234";
const hash = await bcrypt.hash(PASSWORD, 10);

// ===== معلم تجريبي (مفعّل) =====
const [tu] = await sql`
  insert into users (email, password_hash, user_type, status)
  values ('teacher@demo.test', ${hash}, 'teacher', 'active')
  on conflict (email) do update set password_hash = excluded.password_hash, user_type = 'teacher'
  returning id`;
await sql`
  insert into teachers (user_id, full_name, country, qualifications, experience_years, status, per_class_rate)
  select ${tu.id}, 'المعلم التجريبي', 'مصر', 'إجازة في القرآن الكريم', 5, 'Active', 80
  where not exists (select 1 from teachers where user_id = ${tu.id})`;
const [teacher] = await sql`select id from teachers where user_id = ${tu.id} limit 1`;

// ===== طالب تجريبي (مفعّل ومربوط بالمعلم والباقة الأساسية) =====
const [su] = await sql`
  insert into users (email, password_hash, user_type, status)
  values ('student@demo.test', ${hash}, 'student', 'active')
  on conflict (email) do update set password_hash = excluded.password_hash, user_type = 'student'
  returning id`;
const [pkg] = await sql`select id from packages where is_active = true order by price limit 1`;
await sql`
  insert into students (user_id, full_name, country, current_level, memorized_parts, teacher_id, package_id, status)
  select ${su.id}, 'الطالب التجريبي', 'مصر', 'مبتدئ', 0, ${teacher?.id ?? null}, ${pkg?.id ?? null}, 'Active'
  where not exists (select 1 from students where user_id = ${su.id})`;

console.log("✅ بيانات تجريبية جاهزة:");
console.log("   معلم: teacher@demo.test / demo1234");
console.log("   طالب: student@demo.test / demo1234");

await sql.end();
