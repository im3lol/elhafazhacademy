import { sql } from "@/lib/db";
import { academyDay, parseAcademyLocal } from "@/lib/class-status";

/** عدد الأسابيع المقدّمة التي تُولَّد لها أوقات من القوالب المتكررة. */
export const HORIZON_WEEKS = 4;

type Recurring = {
  id: string;
  teacher_id: string;
  weekday: number;
  time_of_day: string;
  duration_minutes: number;
};

/** يحسب مواعيد التكرار القادمة (بتوقيت الأكاديمية) خلال أفق الأسابيع المحدّد. */
export function nextOccurrences(weekday: number, timeOfDay: string, weeks = HORIZON_WEEKS): Date[] {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(timeOfDay)) return [];
  const now = new Date();
  // نبدأ من تاريخ اليوم بتوقيت الأكاديمية عند منتصف نهار UTC:
  // إضافة ٢٤ ساعة منه لا تعبر حدّ اليوم مهما تغيّر التوقيت الصيفي.
  const cursor = new Date(`${academyDay(now).date}T12:00:00Z`);
  const out: Date[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(cursor.getTime() + i * 86400000);
    if (day.getUTCDay() !== weekday) continue;
    const start = parseAcademyLocal(`${day.toISOString().slice(0, 10)}T${timeOfDay}`);
    if (start.getTime() <= now.getTime()) continue;
    out.push(start);
  }
  return out;
}

/**
 * يولّد class_slots مفتوحة من القوالب المتكررة النشطة للأسابيع القادمة.
 * عديم الأثر الجانبي عند التكرار (يتخطّى المواعيد الموجودة مسبقاً). يمكن قصره على معلم واحد.
 * يُرجع عدد الأوقات الجديدة المُنشأة.
 */
export async function materializeRecurringSlots(teacherId?: string): Promise<number> {
  const templates = teacherId
    ? await sql<Recurring[]>`
        select id, teacher_id, weekday, time_of_day, duration_minutes
        from recurring_slots where active and teacher_id = ${teacherId}`
    : await sql<Recurring[]>`
        select id, teacher_id, weekday, time_of_day, duration_minutes
        from recurring_slots where active`;

  // كانت رحلة قاعدة لكل (قالب × موعد): ٢٠ معلماً × ٤ أسابيع = ٨٠ رحلة متتابعة
  // في كل دورة cron. الآن إدراج واحد لكل الصفوف دفعة واحدة.
  const rows = templates.flatMap((t) =>
    nextOccurrences(t.weekday, t.time_of_day).map((start) => ({
      teacher_id: t.teacher_id,
      start_time: start.toISOString(),
      duration_minutes: t.duration_minutes,
      recurring_id: t.id,
    })),
  );
  if (rows.length === 0) return 0;

  const inserted = await sql<{ id: string }[]>`
    insert into class_slots (teacher_id, start_time, duration_minutes, status, recurring_id)
    select v.teacher_id, v.start_time, v.duration_minutes, 'open', v.recurring_id
    from json_to_recordset(${sql.json(rows)}::json) as v(
      teacher_id uuid, start_time timestamptz, duration_minutes int, recurring_id uuid
    )
    where not exists (
      -- الصف الموجود (ولو ملغى) يمنع إعادة التوليد: هكذا يعطّل المعلم أسبوعاً
      select 1 from class_slots c
      where c.teacher_id = v.teacher_id and c.start_time = v.start_time
    )
    returning id`;
  return inserted.length;
}
