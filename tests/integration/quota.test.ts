import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { activeSubscription } from "@/lib/finance/subscriptions";
import { expireStaleSubscriptions } from "@/lib/finance/subscriptions";

const TAG = "vitest-quota";
const tUserEmail = `${TAG}-teacher@test.local`;
const sUserEmail = `${TAG}-student@test.local`;

afterAll(async () => {
  await sql`delete from users where email in (${tUserEmail}, ${sUserEmail})`;
  await sql`delete from packages where name = ${`${TAG}-pkg`}`;
  await sql.end({ timeout: 5 });
});

describe("رصيد الباقة", () => {
  it("يحسب الحصص المحجوزة ضمن الرصيد وينهي الاشتراك المستهلَك", async () => {
    const [tu] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${tUserEmail}, 'x', 'teacher') returning id`;
    const [su] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${sUserEmail}, 'x', 'student') returning id`;
    const [t] = await sql<{ id: string }[]>`
      insert into teachers (user_id, full_name, status) values (${tu.id}, 'معلم حصص', 'Active') returning id`;
    const [s] = await sql<{ id: string }[]>`
      insert into students (user_id, full_name, status) values (${su.id}, 'طالب حصص', 'Active') returning id`;
    const [pkg] = await sql<{ id: string }[]>`
      insert into packages (name, classes_per_month, price, duration_days)
      values (${`${TAG}-pkg`}, 2, 100, 30) returning id`;
    const [sub] = await sql<{ id: string }[]>`
      insert into student_subscriptions (student_id, package_id, start_date, end_date, status, classes_total, classes_used)
      values (${s.id}, ${pkg.id}, current_date, current_date + 30, 'active', 2, 0) returning id`;

    // لا حصص بعد → الرصيد مفتوح
    expect((await activeSubscription(sql, s.id))?.exhausted).toBe(false);

    // حصتان محجوزتان مستقبلاً بلا تقرير: classes_used ما زال صفراً
    await sql`
      insert into classes (student_id, teacher_id, subscription_id, start_time, end_time, status)
      values (${s.id}, ${t.id}, ${sub.id}, now() + interval '1 day', now() + interval '1 day 45 minutes', 'scheduled'),
             (${s.id}, ${t.id}, ${sub.id}, now() + interval '2 days', now() + interval '2 days 45 minutes', 'scheduled')`;

    const after = await activeSubscription(sql, s.id);
    expect(after).toMatchObject({ total: 2, used: 0, pending: 2, exhausted: true });

    // الحصة الملغاة لا تحجز رصيداً
    await sql`update classes set status = 'cancelled' where subscription_id = ${sub.id} and start_time > now() + interval '1 day 12 hours'`;
    expect((await activeSubscription(sql, s.id))?.exhausted).toBe(false);

    // الاستهلاك الكامل يُنهي الاشتراك فيفتح التجديد
    await sql`update student_subscriptions set classes_used = 2 where id = ${sub.id}`;
    expect(await expireStaleSubscriptions(sql, s.id)).toBe(1);
    expect(await activeSubscription(sql, s.id)).toBeNull();
  });
});
