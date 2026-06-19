"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ensureEarningForClass } from "@/lib/finance/earnings";
import { notifyTeacher } from "@/lib/notifications/service";
import { requirePermission } from "@/lib/auth/guards";

const TEACHERS = "teachers.approve";

export async function approveTeacher(formData: FormData) {
  const admin = await requirePermission(TEACHERS);
  const teacherId = formData.get("teacher_id") as string;
  const rateRaw = (formData.get("per_class_rate") as string)?.trim();
  const rate = rateRaw ? Number(rateRaw) : null;
  // الاعتماد يتطلب تكلفة حصة صالحة (الحقل required في الواجهة)
  if (rate == null || isNaN(rate) || rate <= 0) return;

  await sql.begin(async (tx) => {
    await tx`update teachers set status = 'Active', per_class_rate = ${rate} where id = ${teacherId}`;
    // احتسب مستحقات أي حصص مكتملة سابقة الآن بعد تحديد التكلفة
    const completed = await tx<{ id: string }[]>`
      select c.id from classes c
      where c.teacher_id = ${teacherId} and c.status = 'completed'
        and not exists (select 1 from teacher_earnings e where e.class_id = c.id)`;
    for (const c of completed) await ensureEarningForClass(tx, c.id);
    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${admin.id}, 'teacher.approve', 'teacher', ${teacherId}, ${sql.json({ status: "Active", per_class_rate: rate })})`;
  });
  await notifyTeacher(teacherId, "تم اعتماد حسابك ✅", `تم تفعيل حسابك كمعلم بتكلفة حصة ${rate.toLocaleString("ar-EG")} ج.م. يمكنك الآن استقبال الطلاب.`);
  revalidatePath("/admin/teachers");
}

/** تحديث تكلفة الحصة لمعلم معتمد. */
export async function setTeacherRate(formData: FormData) {
  const admin = await requirePermission(TEACHERS);
  const teacherId = formData.get("teacher_id") as string;
  const rate = Number((formData.get("per_class_rate") as string)?.trim());
  if (isNaN(rate) || rate <= 0) return;
  await sql`update teachers set per_class_rate = ${rate} where id = ${teacherId}`;
  await sql`
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
    values (${admin.id}, 'teacher.set_rate', 'teacher', ${teacherId}, ${sql.json({ per_class_rate: rate })})`;
  revalidatePath("/admin/teachers");
}

export async function rejectTeacher(formData: FormData) {
  const admin = await requirePermission(TEACHERS);
  const teacherId = formData.get("teacher_id") as string;
  await sql`update teachers set status = 'Rejected' where id = ${teacherId}`;
  await sql`
    insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
    values (${admin.id}, 'teacher.reject', 'teacher', ${teacherId}, ${sql.json({ status: "Rejected" })})`;
  await notifyTeacher(teacherId, "تحديث على طلب الانضمام", "نعتذر، لم يُعتمد طلب انضمامك كمعلم حالياً. يمكنك التواصل مع الدعم لمزيد من التفاصيل.");
  revalidatePath("/admin/teachers");
}
