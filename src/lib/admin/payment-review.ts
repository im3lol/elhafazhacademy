"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { notifyStudent } from "@/lib/notifications/service";

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  return u;
}

/** موافقة على الدفع → تفعيل الطالب + إنشاء اشتراك + سجل تدقيق. */
export async function approvePayment(formData: FormData) {
  const admin = await ensureAdmin();
  const paymentId = formData.get("payment_id") as string;
  let studentId = "";

  await sql.begin(async (tx) => {
    const [payment] = await tx<{ student_id: string }[]>`
      select student_id from payments where id = ${paymentId} limit 1`;
    if (!payment) throw new Error("الدفع غير موجود");
    studentId = payment.student_id;

    await tx`
      update payments
      set status = 'Payment Approved', reviewed_by = ${admin.id}, reviewed_at = now(), rejection_reason = null
      where id = ${paymentId}`;

    const [student] = await tx<{ id: string; package_id: string | null }[]>`
      select id, package_id from students where id = ${payment.student_id} limit 1`;

    await tx`update students set status = 'Active' where id = ${payment.student_id}`;

    if (student?.package_id) {
      const [existing] = await tx<{ id: string }[]>`
        select id from student_subscriptions where student_id = ${student.id} and status = 'active' limit 1`;
      if (!existing) {
        const [pkg] = await tx<{ classes_per_month: number | null; hours_per_month: number | null; duration_days: number | null }[]>`
          select classes_per_month, hours_per_month, duration_days from packages where id = ${student.package_id} limit 1`;
        await tx`
          insert into student_subscriptions (student_id, package_id, start_date, end_date, status, classes_total, hours_total)
          values (${student.id}, ${student.package_id}, current_date,
                  current_date + ${(pkg?.duration_days ?? 30)} * interval '1 day', 'active',
                  ${pkg?.classes_per_month ?? 0}, ${pkg?.hours_per_month ?? 0})`;
      }
    }

    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${admin.id}, 'payment.approve', 'payment', ${paymentId}, ${sql.json({ status: "Payment Approved" })})`;
  });

  if (studentId) {
    await notifyStudent(studentId, "تم تفعيل حسابك ✅", "تمت الموافقة على دفعتك وتفعيل اشتراكك. يمكنك الآن متابعة حصصك.");
  }
  revalidatePath("/admin/payments");
}

/** رفض الدفع مع سبب. */
export async function rejectPayment(formData: FormData) {
  const admin = await ensureAdmin();
  const paymentId = formData.get("payment_id") as string;
  const reason = ((formData.get("reason") as string) || "").trim() || "غير محدد";
  let studentId = "";

  await sql.begin(async (tx) => {
    const [payment] = await tx<{ student_id: string }[]>`
      select student_id from payments where id = ${paymentId} limit 1`;
    if (!payment) throw new Error("الدفع غير موجود");
    studentId = payment.student_id;

    await tx`
      update payments
      set status = 'Payment Rejected', reviewed_by = ${admin.id}, reviewed_at = now(), rejection_reason = ${reason}
      where id = ${paymentId}`;
    await tx`update students set status = 'Payment Rejected' where id = ${payment.student_id}`;
    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${admin.id}, 'payment.reject', 'payment', ${paymentId}, ${sql.json({ status: "Payment Rejected", reason })})`;
  });

  if (studentId) {
    await notifyStudent(studentId, "تم رفض إثبات الدفع", `السبب: ${reason}. يرجى مراجعة الدفع وإعادة الرفع.`);
  }
  revalidatePath("/admin/payments");
}
