import { sql } from "@/lib/db";

export type AtRiskStudent = { id: string; full_name: string; reasons: string[] };

type Row = {
  id: string;
  full_name: string;
  last_score: number | null;
  last_completed: string | null;
  open_notes: number;
  recent_no_shows: number;
};

const ar = (n: number) => n.toLocaleString("ar-EG");
const DAY = 86_400_000;

// عتبات الرصد
const LOW_SCORE = 60;
const INACTIVE_DAYS = 14;
const OPEN_NOTES = 5;
const NO_SHOWS = 2;

/** يرصد طلاب المعلم النشطين الذين تظهر عليهم مؤشّرات تعثّر، مع أسباب كل حالة. */
export async function getAtRiskStudents(userId: string): Promise<AtRiskStudent[]> {
  const rows = await sql<Row[]>`
    select s.id, s.full_name,
      (select lr.overall_score from lesson_reports lr where lr.student_id = s.id order by lr.created_at desc limit 1) as last_score,
      (select max(c.start_time) from classes c where c.student_id = s.id and c.status = 'completed') as last_completed,
      (select count(*)::int from student_mushaf_mistakes m where m.student_id = s.id and not m.is_resolved) as open_notes,
      (select count(*)::int from classes c where c.student_id = s.id and c.status = 'no_show_student'
         and c.start_time >= now() - interval '30 days') as recent_no_shows
    from students s
    join teachers t on t.id = s.teacher_id
    where t.user_id = ${userId} and s.status = 'Active'
    order by s.full_name`;

  const now = Date.now();
  const out: AtRiskStudent[] = [];
  for (const r of rows) {
    const reasons: string[] = [];
    const score = r.last_score == null ? null : Number(r.last_score);
    if (score != null && score < LOW_SCORE) reasons.push(`تقييم منخفض (${ar(score)}٪)`);
    if (r.last_completed && now - new Date(r.last_completed).getTime() > INACTIVE_DAYS * DAY) {
      reasons.push(`بلا نشاط منذ أكثر من ${ar(INACTIVE_DAYS)} يوماً`);
    }
    if (Number(r.open_notes) >= OPEN_NOTES) reasons.push(`${ar(Number(r.open_notes))} ملاحظة مفتوحة`);
    if (Number(r.recent_no_shows) >= NO_SHOWS) reasons.push(`${ar(Number(r.recent_no_shows))} غياب مؤخراً`);
    if (reasons.length) out.push({ id: r.id, full_name: r.full_name, reasons });
  }
  return out;
}
