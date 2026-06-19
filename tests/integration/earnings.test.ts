import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { ensureEarningForClass } from "@/lib/finance/earnings";

const TAG = "vitest-earn";
const tUserEmail = `${TAG}-teacher@test.local`;
const sUserEmail = `${TAG}-student@test.local`;

afterAll(async () => {
  // حذف المستخدمين يحذف المعلم/الطالب/الحصص/المستحقات بالتتابع (on delete cascade)
  await sql`delete from users where email in (${tUserEmail}, ${sUserEmail})`;
  await sql.end({ timeout: 5 });
});

describe("ensureEarningForClass", () => {
  it("ينشئ مستحقاً بقيمة تكلفة الحصة للحصة المكتملة", async () => {
    const [tu] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${tUserEmail}, 'x', 'teacher') returning id`;
    const [su] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${sUserEmail}, 'x', 'student') returning id`;
    const [t] = await sql<{ id: string }[]>`
      insert into teachers (user_id, full_name, status, per_class_rate) values (${tu.id}, 'معلم اختبار', 'Active', 50) returning id`;
    const [s] = await sql<{ id: string }[]>`
      insert into students (user_id, full_name, status) values (${su.id}, 'طالب اختبار', 'Active') returning id`;
    const [c] = await sql<{ id: string }[]>`
      insert into classes (student_id, teacher_id, start_time, status)
      values (${s.id}, ${t.id}, now(), 'completed') returning id`;

    await ensureEarningForClass(sql, c.id);

    const [e] = await sql<{ amount: string; status: string }[]>`
      select amount, status from teacher_earnings where class_id = ${c.id} limit 1`;
    expect(e).toBeTruthy();
    expect(Number(e.amount)).toBe(50);
    expect(e.status).toBe("pending");
  });

  it("لا ينشئ مستحقاً إذا لم تُحدَّد تكلفة الحصة", async () => {
    const [tu] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${TAG + "-norate@test.local"}, 'x', 'teacher') returning id`;
    const [su] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${TAG + "-norate-s@test.local"}, 'x', 'student') returning id`;
    const [t] = await sql<{ id: string }[]>`
      insert into teachers (user_id, full_name, status, per_class_rate) values (${tu.id}, 'بلا تكلفة', 'Active', null) returning id`;
    const [s] = await sql<{ id: string }[]>`
      insert into students (user_id, full_name, status) values (${su.id}, 'طالب', 'Active') returning id`;
    const [c] = await sql<{ id: string }[]>`
      insert into classes (student_id, teacher_id, start_time, status)
      values (${s.id}, ${t.id}, now(), 'completed') returning id`;

    await ensureEarningForClass(sql, c.id);
    const rows = await sql`select 1 from teacher_earnings where class_id = ${c.id}`;
    expect(rows.length).toBe(0);

    await sql`delete from users where email in (${TAG + "-norate@test.local"}, ${TAG + "-norate-s@test.local"})`;
  });
});
