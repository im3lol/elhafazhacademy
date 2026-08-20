import Link from "next/link";
import { sql } from "@/lib/db";
import { requireProfile } from "@/lib/auth/guards";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { classStatusLabel, classStatusClass, formatClassTime } from "@/lib/class-status";
import { BarChart } from "@/components/admin/dashboard-charts";
import { getAtRiskStudents } from "@/lib/teacher/at-risk";
import { arNum } from "@/lib/utils";

type TeacherRow = { id: string; full_name: string; status: string; experience_years: number | null };
type Counts = {
  students: number; active_students: number; today: number; week: number;
  completed: number; avg_rating: number | null; pending: string | null;
};

const dayLabel = (d: string) => {
  try { return new Date(d).toLocaleDateString("ar-EG", { weekday: "short" }); } catch { return d; }
};

export default async function TeacherDashboard() {
  const { user, profileId: teacherId } = await requireProfile("teacher");

  // القاعدة بعيدة: كل await متسلسل رحلة شبكة كاملة — الخمسة مستقلة فتُنفَّذ معاً
  const [[teacher], [counts], classes7, atRisk, upcoming] = await Promise.all([
        sql<TeacherRow[]>`
          select id, full_name, status, experience_years from teachers where id = ${teacherId} limit 1`,
        sql<Counts[]>`
          select
            (select count(*) from students where teacher_id = ${teacherId})::int as students,
            (select count(*) from students where teacher_id = ${teacherId} and status = 'Active')::int as active_students,
            (select count(*) from classes where teacher_id = ${teacherId}
               and start_time::date = (now() at time zone 'Africa/Cairo')::date and status <> 'cancelled')::int as today,
            (select count(*) from classes where teacher_id = ${teacherId}
               and start_time >= now() - interval '7 days' and status <> 'cancelled')::int as week,
            (select count(*) from classes where teacher_id = ${teacherId} and status = 'completed')::int as completed,
            (select round(avg(overall_score)) from lesson_reports where teacher_id = ${teacherId}) as avg_rating,
            (select coalesce(sum(amount), 0) from teacher_earnings where teacher_id = ${teacherId} and status = 'pending') as pending`,
        sql<{ day: string; value: number }[]>`
          select d.day::text as day, count(c.id)::int as value
          from generate_series(
                 (now() at time zone 'Africa/Cairo')::date - 6,
                 (now() at time zone 'Africa/Cairo')::date, interval '1 day') as d(day)
          left join classes c on c.teacher_id = ${teacherId}
            and c.start_time::date = d.day and c.status <> 'cancelled'
          group by d.day order by d.day`,
        getAtRiskStudents(user.id),
        sql<{ id: string; start_time: string; status: string; meet_link: string | null; student_name: string }[]>`
          select c.id, c.start_time, c.status, c.meet_link, s.full_name as student_name
          from classes c join students s on s.id = c.student_id
          where c.teacher_id = ${teacherId}
            and c.status not in ('completed','cancelled')
            -- الحصص المنتهية بلا تقرير تبقى ظاهرة أسبوعاً كي يسجّلها المعلم
            and (c.start_time >= now() - interval '1 hour'
              or (c.status = 'ended' and c.start_time > now() - interval '7 days'))
          order by c.start_time asc limit 6`,
      ]);

  const isActive = teacher?.status === "Active";

  const stats = counts
    ? [
        { label: "طلابي", value: `${arNum(counts.active_students)} / ${arNum(counts.students)}` },
        { label: "حصص اليوم", value: arNum(counts.today), accent: true },
        { label: "هذا الأسبوع", value: arNum(counts.week) },
        { label: "حصص مكتملة", value: arNum(counts.completed) },
        { label: "متوسط تقييم طلابي", value: counts.avg_rating == null ? "—" : `${arNum(counts.avg_rating)}٪` },
        { label: "مستحقات معلّقة", value: `${arNum(counts.pending)} ج.م`, accent: "gold" as const },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">أهلاً، {teacher?.full_name ?? "أستاذنا"}</h1>
        <p className="mt-1 text-muted">لوحة المعلم.</p>
      </div>

      {!isActive && (
        <Card className="border-warning/30 bg-warning/10 text-sm">
          حسابك قيد المراجعة من الإدارة. بعض الميزات ستُفعّل بعد الاعتماد.
        </Card>
      )}

      {stats.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {stats.map((s) => (
            <Card key={s.label}>
              <p className="text-sm text-muted">{s.label}</p>
              <p
                className={`mt-1 font-display text-2xl font-black tabular-nums ${
                  s.accent === "gold" ? "text-gold" : s.accent ? "text-brand" : ""
                }`}
              >
                {s.value}
              </p>
            </Card>
          ))}
        </div>
      )}

      {atRisk.length > 0 && (
        <Card className="border-warning/30 bg-warning/5">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold">
            <span aria-hidden>⚠️</span> طلاب يحتاجون انتباهك
            <span className="text-sm font-normal text-muted">({arNum(atRisk.length)})</span>
          </h2>
          <div className="space-y-2">
            {atRisk.map((s) => (
              <Link
                key={s.id}
                href={`/teacher/students/${s.code}`}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2 transition-colors hover:border-warning/40"
              >
                <span className="font-medium">{s.full_name}</span>
                <span className="flex flex-wrap gap-1.5">
                  {s.reasons.map((r) => (
                    <span key={r} className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-medium text-warning">
                      {r}
                    </span>
                  ))}
                </span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {classes7.some((d) => d.value > 0) && (
        <Card>
          <h2 className="mb-3 font-display text-lg font-bold">حصصك — آخر ٧ أيام</h2>
          <BarChart data={classes7.map((d) => ({ label: dayLabel(d.day), value: d.value }))} />
        </Card>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">الحصص القادمة</h2>
        {upcoming.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد حصص مجدولة حالياً.</Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((c) => (
              <Card key={c.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">الطالب {c.student_name}</p>
                  <p className="text-sm text-muted" dir="rtl">{formatClassTime(c.start_time)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classStatusClass[c.status] ?? ""}`}>
                    {classStatusLabel[c.status] ?? c.status}
                  </span>
                  {c.meet_link && (
                    <a href={`/api/classes/${c.id}/join`} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm", variant: "outline" })}>
                      دخول الحصة
                    </a>
                  )}
                  <Link href={`/teacher/classes/${c.id}/report`} className={buttonClasses({ size: "sm" })}>
                    تسجيل تقرير
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
