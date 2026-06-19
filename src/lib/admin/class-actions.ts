"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { classSchema } from "@/lib/validators/class";
import { createMeetEvent } from "@/lib/google/meet";
import { notifyStudent, notifyTeacher } from "@/lib/notifications/service";
import { formatClassTime } from "@/lib/class-status";
import { logAudit } from "@/lib/audit";

export type ClassState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  return u;
}

function flatten(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fe: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0] != null ? String(i.path[0]) : "";
    if (k && !fe[k]) fe[k] = i.message;
  }
  return fe;
}

/** جدولة حصة جديدة (وتعيين المعلم للطالب إن لم يكن معيّناً). */
export async function scheduleClass(_prev: ClassState, formData: FormData): Promise<ClassState> {
  const admin = await ensureAdmin();
  const parsed = classSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.issues), error: "تحقق من الحقول" };
  const d = parsed.data;

  const start = new Date(d.start_time);
  if (isNaN(start.getTime())) return { fieldErrors: { start_time: "موعد غير صالح" } };
  const end = new Date(start.getTime() + d.duration_minutes * 60000);

  // الاشتراك النشط للطالب — لربط الحصة به ومنع تجاوز حصص الباقة
  const [sub] = await sql<{ id: string; classes_total: number; classes_used: number }[]>`
    select id, classes_total, classes_used from student_subscriptions
    where student_id = ${d.student_id} and status = 'active'
    order by created_at desc limit 1`;
  if (sub && sub.classes_total > 0 && sub.classes_used >= sub.classes_total) {
    return { error: "نفدت حصص باقة هذا الطالب. يلزم تجديد الاشتراك قبل جدولة حصة جديدة." };
  }
  const subscriptionId = sub?.id ?? null;

  // رابط Meet: يدوي إن وُجد، وإلا يُنشأ تلقائياً عبر Google (إن كان مربوطاً)
  let meetLink = d.meet_link || null;
  let googleEventId: string | null = null;
  if (!meetLink) {
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
      // فشل إنشاء Meet — تُجدوَل الحصة بلا رابط ويُضاف لاحقاً
    }
  }

  const status = meetLink ? "meet_created" : "scheduled";
  const meetCreatedAt = meetLink ? new Date().toISOString() : null;

  await sql.begin(async (tx) => {
    await tx`
      insert into classes (student_id, teacher_id, subscription_id, start_time, end_time, status, meet_link, meet_created_at, google_calendar_event_id)
      values (${d.student_id}, ${d.teacher_id}, ${subscriptionId}, ${start.toISOString()}, ${end.toISOString()},
              ${status}, ${meetLink}, ${meetCreatedAt}, ${googleEventId})`;
    // اربط المعلم بالطالب إن لم يكن معيّناً
    await tx`update students set teacher_id = ${d.teacher_id} where id = ${d.student_id} and teacher_id is null`;
    await tx`
      insert into audit_logs (actor_user_id, action, entity_type, entity_id, new_value)
      values (${admin.id}, 'class.create', 'class', null, ${sql.json({ student_id: d.student_id, teacher_id: d.teacher_id })})`;
  });

  const when = formatClassTime(start.toISOString());
  await Promise.all([
    notifyStudent(d.student_id, "تم جدولة حصة جديدة 📅", `موعد حصتك القادمة: ${when}.`),
    notifyTeacher(d.teacher_id, "تم جدولة حصة جديدة 📅", `لديك حصة مجدولة في: ${when}.`),
  ]);

  revalidatePath("/admin/classes");
  return { success: "تمت جدولة الحصة." };
}

/** إعادة جدولة حصة لموعد جديد (يحافظ على مدة الحصة ورابطها) + إشعار الطرفين. */
export async function rescheduleClass(formData: FormData) {
  const admin = await ensureAdmin();
  const id = formData.get("id") as string;
  const start = new Date(formData.get("start_time") as string);
  if (!id || isNaN(start.getTime())) return;

  const [c] = await sql<{ student_id: string; teacher_id: string; start_time: string; end_time: string | null; meet_link: string | null }[]>`
    select student_id, teacher_id, start_time, end_time, meet_link from classes where id = ${id} limit 1`;
  if (!c) return;

  const durationMs = c.end_time
    ? new Date(c.end_time).getTime() - new Date(c.start_time).getTime()
    : 45 * 60000;
  const end = new Date(start.getTime() + durationMs);
  const status = c.meet_link ? "meet_created" : "scheduled";

  await sql`
    update classes set start_time = ${start.toISOString()}, end_time = ${end.toISOString()}, status = ${status}
    where id = ${id}`;
  await logAudit(admin.id, "class.reschedule", "class", id, { start_time: start.toISOString() });

  const when = formatClassTime(start.toISOString());
  await Promise.all([
    notifyStudent(c.student_id, "تم تغيير موعد الحصة 🔄", `الموعد الجديد: ${when}.`),
    notifyTeacher(c.teacher_id, "تم تغيير موعد الحصة 🔄", `الموعد الجديد: ${when}.`),
  ]);
  revalidatePath("/admin/classes");
}

/** إلغاء حصة. */
export async function cancelClass(formData: FormData) {
  await ensureAdmin();
  const id = formData.get("id") as string;
  await sql`update classes set status = 'cancelled' where id = ${id}`;
  revalidatePath("/admin/classes");
}
