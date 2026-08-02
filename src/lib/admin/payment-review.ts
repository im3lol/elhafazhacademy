"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { notifyStudent } from "@/lib/notifications/service";
import { expireStaleSubscriptions } from "@/lib/finance/subscriptions";
import { requirePermission } from "@/lib/auth/guards";

// مراجعة المدفوعات: الأدوار المحدودة (دعم/محاسب) لا يجب أن تنفّذ هذه الإجراءات
async function ensureAdmin() {
  return requirePermission("payments.review");
}

/** موافقة على الدفع → تفعيل الطالب + إنشاء اشتراك + سجل تدقيق. */
export async function approvePayment(formData: FormData) {
  const admin = await ensureAdmin();
  const paymentId = formData.get("payment_id") as string;
  let studentId = "";

  await sql.begin(async (tx) => {
    // القفل يمنع اعتمادين متزامنين لنفس الدفعة (اشتراكان لدفعة واحدة)
    const [payment] = await tx<{ student_id: string; status: string }[]>`
      select student_id, status from payments where id = ${paymentId} limit 1 for update`;
    if (!payment) throw new Error("الدفع غير موجود");
    if (payment.status === "Payment Approved") return; // اعتُمدت سلفاً — لا تكرّر
    studentId = payment.student_id;

    await tx`
      update payments
      set status = 'Payment Approved', reviewed_by = ${admin.id}, reviewed_at = now(), rejection_reason = null
      where id = ${paymentId}`;

    const [student] = await tx<{ id: string; package_id: string | null }[]>`
      select id, package_id from students where id = ${payment.student_id} limit 1`;

    await tx`update students set status = 'Active' where id = ${payment.student_id}`;

    if (student?.package_id) {
      // ينهي الاشتراك المستهلَك/المنقضي أولاً، وإلا اعتُبر الطالب مشتركاً فلا يُفعَّل تجديده
      await expireStaleSubscriptions(tx, student.id);
      const [existing] = await tx<{ id: string }[]>`
        select id from student_subscriptions where student_id = ${student.id} and status = 'active' limit 1`;
      if (!existing) {
        const [pkg] = await tx<{ classes_per_month: number | null; hours_per_month: number | null; duration_days: number | null }[]>`
          select classes_per_month, hours_per_month, duration_days from packages where id = ${student.package_id} limit 1`;
        // on conflict: القيد الفريد يحرس اعتمادين متزامنين لدفعتين مختلفتين
        // لنفس الطالب — كلٌّ لا يرى اشتراك الآخر قبل الالتزام.
        await tx`
          insert into student_subscriptions (student_id, package_id, start_date, end_date, status, classes_total, hours_total)
          values (${student.id}, ${student.package_id}, current_date,
                  current_date + ${(pkg?.duration_days ?? 30)} * interval '1 day', 'active',
                  ${pkg?.classes_per_month ?? 0}, ${pkg?.hours_per_month ?? 0})
          on conflict (student_id) where status = 'active' do nothing`;
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
    const [payment] = await tx<{ student_id: string; status: string }[]>`
      select student_id, status from payments where id = ${paymentId} limit 1 for update`;
    if (!payment) throw new Error("الدفع غير موجود");
    // رفض دفعة معتمَدة يترك الطالب باشتراك نشط ودفعة مرفوضة — حالة متناقضة
    if (payment.status === "Payment Approved") {
      throw new Error("هذه الدفعة معتمَدة بالفعل. أوقف اشتراك الطالب بدل رفض الدفعة.");
    }
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
