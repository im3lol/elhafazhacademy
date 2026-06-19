"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { ensureEarningForClass } from "@/lib/finance/earnings";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";

const FINANCE = "finance.view";

/** احتساب المستحقات لكل الحصص المكتملة بلا سجل مستحق (مثل الـ cron). */
export async function calculateEarnings() {
  await requirePermission(FINANCE);
  const pending = await sql<{ id: string }[]>`
    select c.id from classes c
    where c.status = 'completed'
      and not exists (select 1 from teacher_earnings e where e.class_id = c.id)`;
  for (const c of pending) {
    await ensureEarningForClass(sql, c.id);
  }
  revalidatePath("/admin/finance");
}

/** اعتماد كل مستحقات معلم المعلّقة. */
export async function approveTeacherEarnings(formData: FormData) {
  const admin = await requirePermission(FINANCE);
  const teacherId = formData.get("teacher_id") as string;
  await sql`update teacher_earnings set status = 'approved' where teacher_id = ${teacherId} and status = 'pending'`;
  await logAudit(admin.id, "earnings.approve", "teacher", teacherId);
  revalidatePath("/admin/finance");
}

/** صرف المستحقات المعتمدة لمعلم: ينشئ payout ويُعلّم المستحقات مدفوعة. */
export async function payoutTeacher(formData: FormData) {
  const admin = await requirePermission(FINANCE);
  const teacherId = formData.get("teacher_id") as string;

  await sql.begin(async (tx) => {
    const [sum] = await tx<{ total: string | null }[]>`
      select sum(amount) as total from teacher_earnings
      where teacher_id = ${teacherId} and status = 'approved'`;
    const total = Number(sum?.total ?? 0);
    if (total <= 0) return;

    await tx`
      insert into teacher_payouts (teacher_id, amount, currency, status, payment_method)
      values (${teacherId}, ${total}, 'EGP', 'paid', 'manual')`;
    await tx`
      update teacher_earnings set status = 'paid', paid_at = now()
      where teacher_id = ${teacherId} and status = 'approved'`;
    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${admin.id}, 'teacher.payout', 'teacher', ${teacherId}, ${sql.json({ amount: total })})`;
  });

  revalidatePath("/admin/finance");
}
