import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { materializeRecurringSlots, HORIZON_WEEKS } from "@/lib/booking/recurring";
import { academyDay } from "@/lib/class-status";

const TAG = "vitest-recur";
const tUserEmail = `${TAG}-teacher@test.local`;

afterAll(async () => {
  await sql`delete from users where email = ${tUserEmail}`;
  await sql.end({ timeout: 5 });
});

/** اليوم الأسبوعي لبعد غد بتوقيت الأكاديمية — يضمن مواعيد مستقبلية دائماً. */
function weekdayInTwoDays() {
  const d = new Date(Date.now() + 2 * 86400000);
  return academyDay(d).weekday;
}

describe("materializeRecurringSlots (إدراج مجمّع)", () => {
  it("يولّد المواعيد، ولا يكرّرها، ولا يعيد إنشاء ما ألغاه المعلم", async () => {
    const [tu] = await sql<{ id: string }[]>`
      insert into users (email, password_hash, user_type) values (${tUserEmail}, 'x', 'teacher') returning id`;
    const [t] = await sql<{ id: string }[]>`
      insert into teachers (user_id, full_name, status) values (${tu.id}, 'معلم تكرار', 'Active') returning id`;
    await sql`
      insert into recurring_slots (teacher_id, weekday, time_of_day, duration_minutes)
      values (${t.id}, ${weekdayInTwoDays()}, '09:15', 45)`;

    const first = await materializeRecurringSlots(t.id);
    expect(first).toBeGreaterThanOrEqual(HORIZON_WEEKS - 1);
    expect(first).toBeLessThanOrEqual(HORIZON_WEEKS);

    // إعادة التشغيل لا تُنشئ شيئاً (عديمة الأثر الجانبي)
    expect(await materializeRecurringSlots(t.id)).toBe(0);

    // المعلم يعطّل أسبوعاً: الإلغاء يجب أن يصمد أمام الدورة التالية
    const [slot] = await sql<{ id: string }[]>`
      select id from class_slots where teacher_id = ${t.id} order by start_time asc limit 1`;
    await sql`update class_slots set status = 'cancelled' where id = ${slot.id}`;
    expect(await materializeRecurringSlots(t.id)).toBe(0);

    const [{ cancelled }] = await sql<{ cancelled: number }[]>`
      select count(*)::int as cancelled from class_slots
      where teacher_id = ${t.id} and status = 'cancelled'`;
    expect(cancelled).toBe(1);

    // كل المواعيد المولّدة في المستقبل وبالوقت المطلوب بتوقيت الأكاديمية
    const slots = await sql<{ start_time: string }[]>`
      select start_time from class_slots where teacher_id = ${t.id} order by start_time`;
    for (const s of slots) {
      const d = new Date(s.start_time);
      expect(d.getTime()).toBeGreaterThan(Date.now());
      expect(d.toLocaleString("sv-SE", { timeZone: "Africa/Cairo" }).slice(11, 16)).toBe("09:15");
    }
  });
});
