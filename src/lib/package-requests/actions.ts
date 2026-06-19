"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export type RequestState = { error?: string; fieldErrors?: Record<string, string> };

/** الطالب يقدّم طلب تغيير باقة. */
export async function createPackageRequest(_prev: RequestState, formData: FormData): Promise<RequestState> {
  const u = await getSessionUser();
  if (!u || u.userType !== "student") redirect("/login");

  const requestedId = (formData.get("requested_package_id") as string) || "";
  const reason = ((formData.get("reason") as string) || "").trim();
  if (!requestedId) return { fieldErrors: { requested_package_id: "اختر الباقة المطلوبة" } };
  if (reason.length < 5) return { fieldErrors: { reason: "اذكر سبب الطلب" } };

  const [student] = await sql<{ id: string; teacher_id: string | null; package_id: string | null }[]>`
    select id, teacher_id, package_id from students where user_id = ${u.id} limit 1`;
  if (!student) return { error: "لا يوجد ملف طالب" };
  if (student.package_id === requestedId) return { fieldErrors: { requested_package_id: "هذه باقتك الحالية" } };

  // إن لم يكن هناك معلم، تُتخطّى مرحلة المعلم
  const teacherStatus = student.teacher_id ? "pending" : "approved";

  await sql`
    insert into package_change_requests
      (student_id, teacher_id, current_package_id, requested_package_id, request_type, reason,
       teacher_status, admin_status, final_status)
    values (${student.id}, ${student.teacher_id}, ${student.package_id}, ${requestedId},
            'change_package', ${reason}, ${teacherStatus}, 'pending', 'pending')`;

  revalidatePath("/student/package");
  redirect("/student/package");
}

/** الطالب يلغي طلبه (إن كان قيد المراجعة). */
export async function cancelPackageRequest(formData: FormData) {
  const u = await getSessionUser();
  if (!u || u.userType !== "student") throw new Error("غير مصرّح");
  const id = formData.get("request_id") as string;
  await sql`
    update package_change_requests pcr set final_status = 'cancelled'
    from students s
    where pcr.id = ${id} and pcr.student_id = s.id and s.user_id = ${u.id} and pcr.final_status = 'pending'`;
  revalidatePath("/student/package");
}

/** مراجعة المعلم (موافقة/رفض مبدئي). */
export async function teacherReviewRequest(formData: FormData) {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  const id = formData.get("request_id") as string;
  const decision = formData.get("decision") as string;
  const note = ((formData.get("note") as string) || "").trim() || null;

  const [teacher] = await sql<{ id: string }[]>`select id from teachers where user_id = ${u.id} limit 1`;
  if (!teacher) throw new Error("لا يوجد ملف معلم");

  if (decision === "approve") {
    await sql`
      update package_change_requests
      set teacher_status = 'approved', teacher_note = ${note}, teacher_reviewed_at = now()
      where id = ${id} and teacher_id = ${teacher.id} and teacher_status = 'pending'`;
  } else {
    await sql`
      update package_change_requests
      set teacher_status = 'rejected', teacher_note = ${note}, teacher_reviewed_at = now(), final_status = 'rejected'
      where id = ${id} and teacher_id = ${teacher.id} and teacher_status = 'pending'`;
  }
  revalidatePath("/teacher/package-requests");
}

/** قرار الإدارة النهائي + تطبيق التغيير. */
export async function adminReviewRequest(formData: FormData) {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  const id = formData.get("request_id") as string;
  const decision = formData.get("decision") as string;
  const note = ((formData.get("note") as string) || "").trim() || null;

  await sql.begin(async (tx) => {
    const [req] = await tx<
      { id: string; student_id: string; requested_package_id: string | null; teacher_status: string; final_status: string }[]
    >`select id, student_id, requested_package_id, teacher_status, final_status
      from package_change_requests where id = ${id} limit 1`;
    if (!req || req.final_status !== "pending") return;
    if (req.teacher_status !== "approved") return; // لا بد من موافقة المعلم أولاً

    if (decision === "approve") {
      await tx`
        update package_change_requests
        set admin_status = 'approved', admin_note = ${note}, admin_reviewed_by = ${u.id},
            admin_reviewed_at = now(), final_status = 'applied'
        where id = ${id}`;
      if (req.requested_package_id) {
        await tx`update students set package_id = ${req.requested_package_id} where id = ${req.student_id}`;
      }
    } else {
      await tx`
        update package_change_requests
        set admin_status = 'rejected', admin_note = ${note}, admin_reviewed_by = ${u.id},
            admin_reviewed_at = now(), final_status = 'rejected'
        where id = ${id}`;
    }
    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${u.id}, ${"package_request." + decision}, 'package_change_request', ${id}, ${sql.json({ decision })})`;
  });

  revalidatePath("/admin/package-requests");
}
