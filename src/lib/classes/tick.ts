import { sql } from "@/lib/db";
import { notify } from "@/lib/notifications/service";
import { materializeRecurringSlots } from "@/lib/booking/recurring";

export type TickResult = { reminded: number; wentLive: number; missed: number; slotsGenerated: number };

type DueClass = {
  class_id: string;
  meet_link: string;
  s_user: string;
  t_user: string;
};

/**
 * مهمة دورية لإدارة دورة حياة الحصص:
 *  ١) إرسال تذكير برابط Meet للطالب والمعلم قبل الحصة (خلال ١٥ دقيقة).
 *  ٢) تحويل الحصص التي حان وقتها إلى "جارية" (live).
 *  ٣) تحديد الغياب للحصص المنتهية (بعد مهلة ١٥ دقيقة) بناءً على نقر «دخول الحصة».
 */
export async function runClassTick(): Promise<TickResult> {
  // ١) تذكير برابط Meet قبل الحصة
  const due = await sql<DueClass[]>`
    select c.id as class_id, c.meet_link, su.id as s_user, tu.id as t_user
    from classes c
    join students s on s.id = c.student_id
    join users su on su.id = s.user_id
    join teachers t on t.id = c.teacher_id
    join users tu on tu.id = t.user_id
    where c.status = 'meet_created'
      and c.meet_link is not null
      and c.meet_sent_at is null
      and c.start_time <= now() + interval '15 minutes'
      and c.start_time >= now() - interval '60 minutes'`;

  for (const c of due) {
    const body = `حصتك على وشك البدء. انضم عبر الرابط: ${c.meet_link}`;
    await notify(c.s_user, "تذكير: حصتك قريباً 🔔", body);
    await notify(c.t_user, "تذكير: حصتك قريباً 🔔", body);
    await sql`update classes set status = 'meet_sent', meet_sent_at = now() where id = ${c.class_id}`;
  }

  // ٢) تحويل الحصص التي بدأت إلى "جارية"
  const live = await sql`
    update classes set status = 'live'
    where status in ('scheduled', 'meet_created', 'meet_sent', 'waiting')
      and start_time <= now()
      and (end_time is null or end_time > now())`;

  // ٣) تحديد الغياب للحصص المنتهية التي لم يحضرها أحد الطرفين (مهلة ١٥ دقيقة)
  const missed = await sql`
    update classes set status = case
        when teacher_join_clicked_at is null then 'no_show_teacher'
        else 'no_show_student' end
    where status in ('scheduled', 'meet_created', 'meet_sent', 'waiting', 'live')
      and end_time is not null
      and end_time < now() - interval '15 minutes'
      and (teacher_join_clicked_at is null or student_join_clicked_at is null)`;

  // ٤) توليد أوقات الحجز من قوالب التوفّر الأسبوعي المتكررة للأسابيع القادمة
  const slotsGenerated = await materializeRecurringSlots();

  return { reminded: due.length, wentLive: live.count, missed: missed.count, slotsGenerated };
}
