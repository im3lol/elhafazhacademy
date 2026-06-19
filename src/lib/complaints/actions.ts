"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { basePathFor } from "@/lib/complaints/config";
import { notify } from "@/lib/notifications/service";
import { logAudit } from "@/lib/audit";

export type ComplaintState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** يتحقق أن المستخدم طرف في التذكرة (منشئ/ضدّه/مسؤول/أدمن). يُرجع التذكرة أو null. */
export async function getAccessibleComplaint(id: string) {
  const u = await getSessionUser();
  if (!u) return null;
  const [c] = await sql<
    {
      id: string; created_by_user_id: string; against_user_id: string | null;
      assigned_to: string | null; category: string | null; priority: string;
      status: string; subject: string | null; description: string | null; created_at: string;
    }[]
  >`select id, created_by_user_id, against_user_id, assigned_to, category, priority, status, subject, description, created_at
    from complaints where id = ${id} limit 1`;
  if (!c) return null;
  const allowed =
    u.userType === "admin" ||
    c.created_by_user_id === u.id ||
    c.against_user_id === u.id ||
    c.assigned_to === u.id;
  return allowed ? { complaint: c, user: u } : null;
}

/** فتح تذكرة جديدة. */
export async function createComplaint(_prev: ComplaintState, formData: FormData): Promise<ComplaintState> {
  const u = await getSessionUser();
  if (!u) redirect("/login");

  const category = (formData.get("category") as string) || "other";
  const subject = ((formData.get("subject") as string) || "").trim();
  const description = ((formData.get("description") as string) || "").trim();
  const priority = (formData.get("priority") as string) || "medium";

  const fe: Record<string, string> = {};
  if (subject.length < 3) fe.subject = "العنوان مطلوب";
  if (description.length < 5) fe.description = "اكتب وصفاً كافياً";
  if (Object.keys(fe).length) return { fieldErrors: fe };

  const [c] = await sql<{ id: string }[]>`
    insert into complaints (created_by_user_id, category, priority, status, subject, description)
    values (${u.id}, ${category}, ${priority}, 'Open', ${subject}, ${description})
    returning id`;

  revalidatePath(`${basePathFor(u.userType)}/complaints`);
  redirect(`${basePathFor(u.userType)}/complaints/${c.id}`);
}

/** إضافة رد على التذكرة. */
export async function addMessage(formData: FormData) {
  const access = await getAccessibleComplaint(formData.get("complaint_id") as string);
  if (!access) throw new Error("غير مصرّح");
  const { complaint, user } = access;
  const message = ((formData.get("message") as string) || "").trim();
  if (!message) return;

  await sql.begin(async (tx) => {
    await tx`
      insert into complaint_messages (complaint_id, sender_user_id, message)
      values (${complaint.id}, ${user.id}, ${message})`;

    // انتقال الحالة تلقائياً
    if (user.userType === "admin" && complaint.status === "Open") {
      await tx`update complaints set status = 'In Progress' where id = ${complaint.id}`;
    } else if (user.userType !== "admin" && complaint.status === "Waiting For User") {
      await tx`update complaints set status = 'In Progress' where id = ${complaint.id}`;
    }
  });

  // أبلغ بقية أطراف التذكرة (عدا المُرسِل) بوجود ردّ جديد
  const recipients = [complaint.created_by_user_id, complaint.against_user_id, complaint.assigned_to]
    .filter((id): id is string => !!id && id !== user.id);
  const subject = complaint.subject ? `: ${complaint.subject}` : "";
  await Promise.all(
    [...new Set(recipients)].map((id) =>
      notify(id, "رد جديد على تذكرتك 💬", `هناك رد جديد على الشكوى${subject}.`),
    ),
  );

  revalidatePath(`${basePathFor(user.userType)}/complaints/${complaint.id}`);
}

/** تغيير حالة التذكرة (أدمن فقط). */
export async function setComplaintStatus(formData: FormData) {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  const id = formData.get("complaint_id") as string;
  const status = formData.get("status") as string;
  const closing = status === "Resolved" || status === "Closed";
  await sql`
    update complaints set status = ${status}, closed_at = ${closing ? new Date().toISOString() : null}
    where id = ${id}`;
  await logAudit(u.id, "complaint.status", "complaint", id, { status });
  revalidatePath(`/admin/complaints/${id}`);
  revalidatePath(`/admin/complaints`);
}

/** إسناد التذكرة للأدمن الحالي. */
export async function assignToMe(formData: FormData) {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  const id = formData.get("complaint_id") as string;
  await sql`update complaints set assigned_to = ${u.id} where id = ${id}`;
  await logAudit(u.id, "complaint.assign", "complaint", id);
  revalidatePath(`/admin/complaints/${id}`);
}
