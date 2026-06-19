import { sql } from "@/lib/db";
import { notifyStudent } from "@/lib/notifications/service";

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];

export type ProgressMonth = { label: string; n: number; avg: number };
export type Achievement = { key: string; icon: string; title: string; earned: boolean; earnedAt: string | null };
export type StudentProgress = {
  memorized: number;
  totalLessons: number;
  bestScore: number | null;
  resolved: number;
  months: ProgressMonth[];
  hasMonthlyScores: boolean;
  achievements: Achievement[];
  earnedCount: number;
  /** الإنجازات المكتسَبة مرتّبة من الأحدث للأقدم (للخط الزمني). */
  timeline: Achievement[];
};

type Monthly = { ym: string; n: number; avg_score: number | null };
export type Ctx = { memorized: number; totalLessons: number; bestScore: number | null };

const ACHIEVEMENTS: { key: string; icon: string; title: string; test: (c: Ctx) => boolean }[] = [
  { key: "first_lesson", icon: "🌱", title: "أول حصة", test: (c) => c.totalLessons >= 1 },
  { key: "juz_1", icon: "📘", title: "أتممت الجزء الأول", test: (c) => c.memorized >= 1 },
  { key: "excellent", icon: "⭐", title: "تقييم ممتاز (٩٠٪+)", test: (c) => c.bestScore != null && c.bestScore >= 90 },
  { key: "lessons_10", icon: "🔁", title: "١٠ حصص مكتملة", test: (c) => c.totalLessons >= 10 },
  { key: "juz_5", icon: "🏅", title: "٥ أجزاء محفوظة", test: (c) => c.memorized >= 5 },
  { key: "juz_15", icon: "🌙", title: "نصف القرآن (١٥ جزءاً)", test: (c) => c.memorized >= 15 },
  { key: "juz_20", icon: "📗", title: "عشرون جزءاً", test: (c) => c.memorized >= 20 },
  { key: "juz_30", icon: "🕌", title: "ختمت القرآن 🎉", test: (c) => c.memorized >= 30 },
];

/** مفاتيح الإنجازات المستحقّة وفق سياق الطالب (دالّة نقيّة قابلة للاختبار). */
export function earnedAchievementKeys(ctx: Ctx): string[] {
  return ACHIEVEMENTS.filter((a) => a.test(ctx)).map((a) => a.key);
}

/**
 * يمنح الإنجازات المكتسَبة الجديدة (مرّة واحدة لكل إنجاز) ويُرجع خريطة المفتاح→تاريخ الاكتساب.
 * notify=true يُرسل إشعاراً للطالب بكل إنجاز جديد — يُستدعى من الحدث (تسجيل التقرير) لتوقيت دقيق.
 */
export async function reconcileAchievements(
  studentId: string,
  ctx: Ctx,
  notify = false,
): Promise<Map<string, string>> {
  const earnedKeys = earnedAchievementKeys(ctx);
  const existing = await sql<{ achievement_key: string; earned_at: string }[]>`
    select achievement_key, earned_at from student_achievements where student_id = ${studentId}`;
  const earnedAt = new Map(existing.map((r) => [r.achievement_key, r.earned_at]));

  for (const k of earnedKeys) {
    if (earnedAt.has(k)) continue;
    const [row] = await sql<{ earned_at: string }[]>`
      insert into student_achievements (student_id, achievement_key) values (${studentId}, ${k})
      on conflict (student_id, achievement_key) do nothing
      returning earned_at`;
    if (row) {
      earnedAt.set(k, row.earned_at);
      if (notify) {
        const a = ACHIEVEMENTS.find((x) => x.key === k)!;
        await notifyStudent(studentId, "إنجاز جديد 🎉", `${a.icon} ${a.title}`);
      }
    }
  }
  return earnedAt;
}

/** يحسب سياق الإنجازات (الأجزاء المحفوظة + إجمالي الحصص + أفضل تقييم) لطالب. */
export async function loadAchievementCtx(studentId: string, memorizedParts: number): Promise<Ctx> {
  const [[totals], [{ best }]] = await Promise.all([
    sql<{ total: number }[]>`select count(*)::int as total from lesson_reports where student_id = ${studentId}`,
    sql<{ best: number | null }[]>`select max(overall_score) as best from lesson_reports where student_id = ${studentId}`,
  ]);
  return {
    memorized: Math.max(0, Math.min(30, Math.floor(memorizedParts))),
    totalLessons: Number(totals?.total ?? 0),
    bestScore: best == null ? null : Number(best),
  };
}

/** يحسب بيانات تقدّم الطالب عبر الزمن (خريطة الحفظ + النشاط الشهري + الإنجازات). */
export async function getStudentProgress(studentId: string, memorizedParts: number): Promise<StudentProgress> {
  const [monthly, [totals], [{ best }], [mistakeSummary]] = await Promise.all([
    sql<Monthly[]>`
      select to_char(date_trunc('month', created_at), 'YYYY-MM') as ym,
             count(*)::int as n,
             round(avg(overall_score))::int as avg_score
      from lesson_reports
      where student_id = ${studentId} and created_at >= date_trunc('month', now()) - interval '5 months'
      group by 1`,
    sql<{ total: number }[]>`select count(*)::int as total from lesson_reports where student_id = ${studentId}`,
    sql<{ best: number | null }[]>`select max(overall_score) as best from lesson_reports where student_id = ${studentId}`,
    sql<{ resolved: number }[]>`select count(*) filter (where status = 'resolved')::int as resolved from student_mistakes where student_id = ${studentId}`,
  ]);

  const memorized = Math.max(0, Math.min(30, Math.floor(memorizedParts)));
  const totalLessons = Number(totals?.total ?? 0);
  const bestScore = best == null ? null : Number(best);
  const resolved = Number(mistakeSummary?.resolved ?? 0);

  const now = new Date();
  const byKey = new Map(monthly.map((m) => [m.ym, m]));
  const months: ProgressMonth[] = Array.from({ length: 6 }, (_, idx) => {
    const i = 5 - idx;
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const row = byKey.get(key);
    return { label: AR_MONTHS[d.getMonth()], n: row?.n ?? 0, avg: row?.avg_score ?? 0 };
  });
  const hasMonthlyScores = months.some((m) => m.avg > 0);

  // مصالحة كسولة عند العرض (بلا إشعار — الإشعار يتمّ وقت الحدث في reconcileAchievements(notify))
  const ctx: Ctx = { memorized, totalLessons, bestScore };
  const earnedAt = await reconcileAchievements(studentId, ctx, false);

  const achievements: Achievement[] = ACHIEVEMENTS.map((a) => ({
    key: a.key,
    icon: a.icon,
    title: a.title,
    earned: earnedAt.has(a.key),
    earnedAt: earnedAt.get(a.key) ?? null,
  }));
  const timeline = achievements
    .filter((a) => a.earned && a.earnedAt)
    .sort((x, y) => +new Date(y.earnedAt!) - +new Date(x.earnedAt!));

  return {
    memorized,
    totalLessons,
    bestScore,
    resolved,
    months,
    hasMonthlyScores,
    achievements,
    earnedCount: achievements.filter((a) => a.earned).length,
    timeline,
  };
}
