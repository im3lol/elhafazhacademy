import { describe, it, expect, afterAll } from "vitest";
import { sql } from "@/lib/db";
import { teacherIdOwningStudent, ownerOfMushafMistake } from "@/lib/mushaf/ownership";

const TAG = "vitest-mushaf";
const emails = [`${TAG}-t1@test.local`, `${TAG}-t2@test.local`, `${TAG}-s@test.local`];

afterAll(async () => {
  // احذف الأخطاء أولاً (FK المعلم بلا cascade) ثم المستخدمين (cascade للباقي)
  await sql`delete from student_mushaf_mistakes where teacher_id in (
    select t.id from teachers t join users u on u.id = t.user_id where u.email in ${sql(emails)})`;
  await sql`delete from users where email in ${sql(emails)}`;
  await sql.end({ timeout: 5 });
});

describe("ملكية المصحف (RBAC)", () => {
  it("المعلم يصل لطلابه فقط، ولا يصل لطالب معلم آخر", async () => {
    const [t1u] = await sql<{ id: string }[]>`insert into users (email, password_hash, user_type) values (${emails[0]}, 'x', 'teacher') returning id`;
    const [t2u] = await sql<{ id: string }[]>`insert into users (email, password_hash, user_type) values (${emails[1]}, 'x', 'teacher') returning id`;
    const [su] = await sql<{ id: string }[]>`insert into users (email, password_hash, user_type) values (${emails[2]}, 'x', 'student') returning id`;
    const [t1] = await sql<{ id: string }[]>`insert into teachers (user_id, full_name, status) values (${t1u.id}, 'معلم ١', 'Active') returning id`;
    await sql`insert into teachers (user_id, full_name, status) values (${t2u.id}, 'معلم ٢', 'Active')`;
    const [s] = await sql<{ id: string }[]>`insert into students (user_id, full_name, status, teacher_id) values (${su.id}, 'طالب', 'Active', ${t1.id}) returning id`;

    // المعلم المالك يحصل على معرّفه؛ المعلم الآخر لا (null)
    expect(await teacherIdOwningStudent(sql, s.id, t1u.id)).toBe(t1.id);
    expect(await teacherIdOwningStudent(sql, s.id, t2u.id)).toBeNull();

    // خطأ مصحف للطالب: مالكه فقط يصل إليه
    const [m] = await sql<{ id: string }[]>`
      insert into student_mushaf_mistakes (student_id, teacher_id, surah_number, ayah_number, mistake_type, title)
      values (${s.id}, ${t1.id}, 2, 255, 'tajweed', 'اختبار') returning id`;
    const owner = await ownerOfMushafMistake(sql, m.id, t1u.id);
    expect(owner?.studentId).toBe(s.id);
    expect(await ownerOfMushafMistake(sql, m.id, t2u.id)).toBeNull();
  });
});
