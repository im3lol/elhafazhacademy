"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { createMeetEvent } from "@/lib/google/meet";
import { notifyStudent, notifyTeacher } from "@/lib/notifications/service";
import { formatClassTime } from "@/lib/class-status";
import { logAudit } from "@/lib/audit";
import { materializeRecurringSlots } from "@/lib/booking/recurring";

export type BookingState = { error?: string; success?: string };

async function currentTeacher() {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  const [t] = await sql<{ id: string }[]>`select id from teachers where user_id = ${u.id} limit 1`;
  if (!t) throw new Error("لا يوجد ملف معلم");
  return t.id;
}

/** المعلم يضيف وقتاً متاحاً للحجز. */
export async function addSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const teacherId = await currentTeacher();
  const start = new Date(formData.get("start_time") as string);
  const duration = Number(formData.get("duration_minutes") ?? 45) || 45;
  if (isNaN(start.getTime())) return { error: "موعد غير صالح" };
  if (start.getTime() < Date.now()) return { error: "لا يمكن إضافة وقت في الماضي" };

  await sql`
    insert into class_slots (teacher_id, start_time, duration_minutes, status)
    values (${teacherId}, ${start.toISOString()}, ${duration}, 'open')`;
  revalidatePath("/teacher/availability");
  return { success: "تمت إضافة الوقت المتاح." };
}

/** المعلم يحذف وقتاً متاحاً (غير محجوز). */
export async function removeSlot(formData: FormData) {
  const teacherId = await currentTeacher();
  const id = formData.get("slot_id") as string;
  await sql`delete from class_slots where id = ${id} and teacher_id = ${teacherId} and status = 'open'`;
  revalidatePath("/teacher/availability");
}

/** المعلم يضيف قالب توفّر أسبوعياً متكرراً (يُولِّد أوقاتاً للأسابيع القادمة فوراً). */
export async function addRecurringSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const teacherId = await currentTeacher();
  const weekday = Number(formData.get("weekday"));
  const timeOfDay = String(formData.get("time_of_day") ?? "");
  const duration = Number(formData.get("duration_minutes") ?? 45) || 45;

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: "اختر يوماً صحيحاً" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) return { error: "وقت غير صالح" };

  const [existing] = await sql<{ id: string }[]>`
    select id from recurring_slots
    where teacher_id = ${teacherId} and weekday = ${weekday} and time_of_day = ${timeOfDay} and active limit 1`;
  if (existing) return { error: "لديك قالب بنفس اليوم والوقت بالفعل." };

  await sql`
    insert into recurring_slots (teacher_id, weekday, time_of_day, duration_minutes)
    values (${teacherId}, ${weekday}, ${timeOfDay}, ${duration})`;

  const created = await materializeRecurringSlots(teacherId);
  revalidatePath("/teacher/availability");
  return { success: `تمت إضافة القالب الأسبوعي — وُلِّد ${created.toLocaleString("ar-EG")} موعداً.` };
}

/** المعلم يوقف قالباً متكرراً (يحذف أيضاً أوقاته القادمة غير المحجوزة). */
export async function removeRecurringSlot(formData: FormData) {
  const teacherId = await currentTeacher();
  const id = formData.get("recurring_id") as string;
  await sql.begin(async (tx) => {
    await tx`
      delete from class_slots
      where recurring_id = ${id} and teacher_id = ${teacherId} and status = 'open' and start_time > now()`;
    await tx`delete from recurring_slots where id = ${id} and teacher_id = ${teacherId}`;
  });
  revalidatePath("/teacher/availability");
}

/** الطالب يحجز وقتاً متاحاً → تُنشأ حصة (مع Meet + ربط الاشتراك + إشعار). */
export async function bookSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const u = await getSessionUser();
  if (!u || u.userType !== "student") return { error: "غير مصرّح" };
  const slotId = formData.get("slot_id") as string;

  const [student] = await sql<{ id: string; teacher_id: string | null; status: string }[]>`
    select id, teacher_id, status from students where user_id = ${u.id} limit 1`;
  if (!student) return { error: "لا يوجد ملف طالب" };
  if (student.status !== "Active") return { error: "حسابك غير مفعّل. أكمل الدفع أولاً." };
  if (!student.teacher_id) return { error: "لم يُعيَّن لك معلم بعد." };

  // الاشتراك النشط — منع تجاوز حصص الباقة
  const [sub] = await sql<{ id: string; classes_total: number; classes_used: number }[]>`
    select id, classes_total, classes_used from student_subscriptions
    where student_id = ${student.id} and status = 'active' order by created_at desc limit 1`;
  if (sub && sub.classes_total > 0 && sub.classes_used >= sub.classes_total) {
    return { error: "نفدت حصص باقتك. جدّد الاشتراك للحجز." };
  }

  // الوقت يجب أن يكون لمعلم الطالب ومتاحاً وفي المستقبل
  const [slot] = await sql<{ id: string; start_time: string; duration_minutes: number }[]>`
    select id, start_time, duration_minutes from class_slots
    where id = ${slotId} and teacher_id = ${student.teacher_id} and status = 'open'
      and start_time > now() limit 1`;
  if (!slot) return { error: "هذا الوقت لم يعد متاحاً." };

  const start = new Date(slot.start_time);
  const end = new Date(start.getTime() + slot.duration_minutes * 60000);

  let meetLink: string | null = null;
  let googleEventId: string | null = null;
  try {
    const ev = await createMeetEvent({
      summary: "حصة قرآن — أكاديمية الحفظة",
      startISO: start.toISOString(),
      endISO: end.toISOString(),
      timeZone: "Africa/Cairo",
    });
    if (ev) {
      meetLink = ev.meetLink;
      googleEventId = ev.eventId;
    }
  } catch {
    // يُجدوَل بلا رابط ويُضاف لاحقاً
  }
  const status = meetLink ? "meet_created" : "scheduled";
  const meetCreatedAt = meetLink ? new Date().toISOString() : null;

  let classId = "";
  await sql.begin(async (tx) => {
    // إقفال الوقت ذرّياً (يمنع الحجز المزدوج)
    const locked = await tx<{ id: string }[]>`
      update class_slots set status = 'booked' where id = ${slot.id} and status = 'open' returning id`;
    if (locked.length === 0) throw new Error("SLOT_TAKEN");

    const [cls] = await tx<{ id: string }[]>`
      insert into classes (student_id, teacher_id, subscription_id, start_time, end_time, status, meet_link, meet_created_at, google_calendar_event_id)
      values (${student.id}, ${student.teacher_id}, ${sub?.id ?? null}, ${start.toISOString()}, ${end.toISOString()},
              ${status}, ${meetLink}, ${meetCreatedAt}, ${googleEventId})
      returning id`;
    classId = cls.id;
    await tx`update class_slots set booked_class_id = ${cls.id} where id = ${slot.id}`;
  }).catch((e) => {
    if (e instanceof Error && e.message === "SLOT_TAKEN") return;
    throw e;
  });

  if (!classId) return { error: "سُبقت إلى هذا الوقت. اختر وقتاً آخر." };

  const when = formatClassTime(start.toISOString());
  await Promise.all([
    notifyStudent(student.id, "تم تأكيد حجز حصتك ✅", `موعد حصتك: ${when}.`),
    notifyTeacher(student.teacher_id, "حجز طالب حصة جديدة 📅", `حصة في: ${when}.`),
  ]);
  await logAudit(u.id, "class.book", "class", classId, { slot_id: slot.id });

  revalidatePath("/student/booking");
  revalidatePath("/student/schedule");
  return { success: `تم الحجز بنجاح — ${when}` };
}
