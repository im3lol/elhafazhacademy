"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { createMeetEvent, deleteMeetEvent } from "@/lib/google/meet";
import { notifyStudent, notifyTeacher } from "@/lib/notifications/service";
import { formatClassTime, parseAcademyLocal } from "@/lib/class-status";
import { logAudit } from "@/lib/audit";
import { materializeRecurringSlots } from "@/lib/booking/recurring";
import { activeSubscription } from "@/lib/finance/subscriptions";
import { currentTeacherId } from "@/lib/auth/guards";

export type BookingState = { error?: string; success?: string };

/** المعلم يضيف وقتاً متاحاً للحجز. */
export async function addSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const teacherId = await currentTeacherId();
  const start = parseAcademyLocal(formData.get("start_time") as string);
  const duration = Number(formData.get("duration_minutes") ?? 45) || 45;
  if (isNaN(start.getTime())) return { error: "موعد غير صالح" };
  if (start.getTime() < Date.now()) return { error: "لا يمكن إضافة وقت في الماضي" };
  if (duration < 15 || duration > 180) return { error: "المدة يجب أن تكون بين ١٥ و١٨٠ دقيقة" };

  const end = new Date(start.getTime() + duration * 60000);
  // وقتان متداخلان يُحجزان معاً = حصتان متزامنتان على المعلم نفسه
  const [clash] = await sql<{ kind: string }[]>`
    select 'slot' as kind from class_slots
    where teacher_id = ${teacherId} and status <> 'cancelled'
      and start_time < ${end.toISOString()}
      and start_time + make_interval(mins => duration_minutes) > ${start.toISOString()}
    union all
    select 'class' as kind from classes
    where teacher_id = ${teacherId}
      and status not in ('cancelled','rescheduled')
      and start_time < ${end.toISOString()}
      and coalesce(end_time, start_time + interval '45 minutes') > ${start.toISOString()}
    limit 1`;
  if (clash) {
    return {
      error: clash.kind === "class"
        ? "لديك حصة مجدولة تتقاطع مع هذا الوقت."
        : "لديك وقت متاح يتقاطع مع هذا الوقت.",
    };
  }

  await sql`
    insert into class_slots (teacher_id, start_time, duration_minutes, status)
    values (${teacherId}, ${start.toISOString()}, ${duration}, 'open')`;
  revalidatePath("/teacher/availability");
  return { success: "تمت إضافة الوقت المتاح." };
}

/**
 * المعلم يحذف وقتاً متاحاً (غير محجوز).
 * يُلغى ولا يُحذف: الصف المحذوف يعيده مولّد القوالب المتكررة في أول دورة،
 * فلا يستطيع المعلم تعطيل أسبوع واحد. الصف الملغى يبقى فيمنع إعادة التوليد.
 */
export async function removeSlot(formData: FormData) {
  const teacherId = await currentTeacherId();
  const id = formData.get("slot_id") as string;
  await sql`
    update class_slots set status = 'cancelled'
    where id = ${id} and teacher_id = ${teacherId} and status = 'open'`;
  revalidatePath("/teacher/availability");
}

/** المعلم يضيف قالب توفّر أسبوعياً متكرراً (يُولِّد أوقاتاً للأسابيع القادمة فوراً). */
export async function addRecurringSlot(_prev: BookingState, formData: FormData): Promise<BookingState> {
  const teacherId = await currentTeacherId();
  const weekday = Number(formData.get("weekday"));
  const timeOfDay = String(formData.get("time_of_day") ?? "");
  const duration = Number(formData.get("duration_minutes") ?? 45) || 45;

  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return { error: "اختر يوماً صحيحاً" };
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) return { error: "وقت غير صالح" };

  if (duration < 15 || duration > 180) return { error: "المدة يجب أن تكون بين ١٥ و١٨٠ دقيقة" };

  // التقاطع لا التطابق فقط: قالب ١٥:٠٠ (٤٥د) وآخر ١٥:٣٠ يولّدان أوقاتاً متداخلة
  const [existing] = await sql<{ id: string }[]>`
    select id from recurring_slots
    where teacher_id = ${teacherId} and active and weekday = ${weekday}
      and time_of_day::time < (${timeOfDay}::time + make_interval(mins => ${duration}))
      and (time_of_day::time + make_interval(mins => duration_minutes)) > ${timeOfDay}::time
    limit 1`;
  if (existing) return { error: "لديك قالب في هذا اليوم يتقاطع مع هذا الوقت." };

  await sql`
    insert into recurring_slots (teacher_id, weekday, time_of_day, duration_minutes)
    values (${teacherId}, ${weekday}, ${timeOfDay}, ${duration})`;

  const created = await materializeRecurringSlots(teacherId);
  revalidatePath("/teacher/availability");
  return { success: `تمت إضافة القالب الأسبوعي — وُلِّد ${created.toLocaleString("ar-EG")} موعداً.` };
}

/** المعلم يوقف قالباً متكرراً (يحذف أيضاً أوقاته القادمة غير المحجوزة). */
export async function removeRecurringSlot(formData: FormData) {
  const teacherId = await currentTeacherId();
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

  // الاشتراك النشط — منع تجاوز حصص الباقة (المكتملة + المحجوزة)
  const sub = await activeSubscription(sql, student.id);
  if (sub?.exhausted) {
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

  if (!classId) {
    // سبقنا طالب آخر بعد إنشاء حدث Meet — يُحذف وإلا بقي اجتماع لحصة لم تُنشأ
    if (googleEventId) await deleteMeetEvent(googleEventId);
    return { error: "سُبقت إلى هذا الوقت. اختر وقتاً آخر." };
  }

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
