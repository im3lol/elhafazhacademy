import { sql } from "@/lib/db";

/** عدد الأسابيع المقدّمة التي تُولَّد لها أوقات من القوالب المتكررة. */
export const HORIZON_WEEKS = 4;

type Recurring = {
  id: string;
  teacher_id: string;
  weekday: number;
  time_of_day: string;
  duration_minutes: number;
};

/** يحسب مواعيد التكرار القادمة (بتوقيت الخادم) خلال أفق الأسابيع المحدّد. */
export function nextOccurrences(weekday: number, timeOfDay: string, weeks = HORIZON_WEEKS): Date[] {
  const [h, m] = timeOfDay.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return [];
  const now = new Date();
  const out: Date[] = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    if (d.getDay() !== weekday) continue;
    d.setHours(h, m, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    out.push(d);
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

  let created = 0;
  for (const t of templates) {
    for (const start of nextOccurrences(t.weekday, t.time_of_day)) {
      const inserted = await sql<{ id: string }[]>`
        insert into class_slots (teacher_id, start_time, duration_minutes, status, recurring_id)
        select ${t.teacher_id}, ${start.toISOString()}, ${t.duration_minutes}, 'open', ${t.id}
        where not exists (
          select 1 from class_slots
          where teacher_id = ${t.teacher_id} and start_time = ${start.toISOString()}
        )
        returning id`;
      created += inserted.length;
    }
  }
  return created;
}
