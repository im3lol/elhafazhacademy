"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

async function currentTeacher() {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  const [t] = await sql<{ id: string }[]>`select id from teachers where user_id = ${u.id} limit 1`;
  if (!t) throw new Error("لا يوجد ملف معلم");
  return t.id;
}

/** المعلم يطلب استقبال طالب بلا معلم. */
export async function requestStudent(formData: FormData) {
  const teacherId = await currentTeacher();
  const studentId = formData.get("student_id") as string;

  const [student] = await sql<{ id: string; teacher_id: string | null; status: string }[]>`
    select id, teacher_id, status from students where id = ${studentId} limit 1`;
  if (!student || student.teacher_id || student.status !== "Active") return;

  const [existing] = await sql<{ id: string }[]>`
    select id from student_teacher_requests
    where teacher_id = ${teacherId} and student_id = ${studentId} and status = 'pending' limit 1`;
  if (existing) return;

  await sql`
    insert into student_teacher_requests (teacher_id, student_id, status)
    values (${teacherId}, ${studentId}, 'pending')`;
  revalidatePath("/teacher/new-students");
}

/** المعلم يلغي طلبه المعلّق. */
export async function cancelStudentRequest(formData: FormData) {
  const teacherId = await currentTeacher();
  const id = formData.get("request_id") as string;
  await sql`
    update student_teacher_requests set status = 'cancelled'
    where id = ${id} and teacher_id = ${teacherId} and status = 'pending'`;
  revalidatePath("/teacher/new-students");
}

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  return u;
}

/** الإدارة توافق وتعيّن الطالب للمعلم. */
export async function approveStudentRequest(formData: FormData) {
  const admin = await ensureAdmin();
  const id = formData.get("request_id") as string;

  await sql.begin(async (tx) => {
    const [req] = await tx<{ id: string; teacher_id: string; student_id: string; status: string }[]>`
      select id, teacher_id, student_id, status from student_teacher_requests where id = ${id} limit 1`;
    if (!req || req.status !== "pending") return;

    await tx`
      update student_teacher_requests
      set status = 'admin_approved', admin_reviewed_by = ${admin.id}, admin_reviewed_at = now()
      where id = ${id}`;

    // عيّن الطالب للمعلم إن لم يكن معيّناً
    await tx`update students set teacher_id = ${req.teacher_id} where id = ${req.student_id} and teacher_id is null`;

    // ارفض باقي الطلبات المعلّقة لنفس الطالب
    await tx`
      update student_teacher_requests set status = 'admin_rejected', admin_reviewed_by = ${admin.id}, admin_reviewed_at = now()
      where student_id = ${req.student_id} and status = 'pending' and id <> ${id}`;

    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${admin.id}, 'student_request.approve', 'student_teacher_request', ${id},
              ${sql.json({ teacher_id: req.teacher_id, student_id: req.student_id })})`;
  });

  revalidatePath("/admin/student-requests");
}

/** الإدارة ترفض الطلب. */
export async function rejectStudentRequest(formData: FormData) {
  const admin = await ensureAdmin();
  const id = formData.get("request_id") as string;
  await sql`
    update student_teacher_requests
    set status = 'admin_rejected', admin_reviewed_by = ${admin.id}, admin_reviewed_at = now()
    where id = ${id} and status = 'pending'`;
  revalidatePath("/admin/student-requests");
}
