import Link from "next/link";
import { Card } from "@/components/ui/card";
import { buttonClasses } from "@/components/ui/button";
import { classStatusLabel, classStatusClass, formatClassTime } from "@/lib/class-status";
import { PastClassesTable } from "@/components/dashboard/past-classes-table";

export type ScheduleRow = {
  id: string;
  start_time: string;
  status: string;
  meet_link: string | null;
  other_name: string;
  overall_score: number | null;
};

const ACTIVE = new Set(["scheduled", "meet_created", "meet_sent", "waiting", "live"]);

/** يفصل الحصص إلى قادمة (نشطة ومستقبلية) وسابقة. */
export function splitSchedule(rows: ScheduleRow[]) {
  const now = Date.now();
  const upcoming: ScheduleRow[] = [];
  const past: ScheduleRow[] = [];
  for (const r of rows) {
    const future = new Date(r.start_time).getTime() >= now - 60 * 60 * 1000;
    if (ACTIVE.has(r.status) && future) upcoming.push(r);
    else past.push(r);
  }
  upcoming.sort((a, b) => +new Date(a.start_time) - +new Date(b.start_time));
  past.sort((a, b) => +new Date(b.start_time) - +new Date(a.start_time));
  return { upcoming, past };
}

function ClassRow({ c, role }: { c: ScheduleRow; role: "student" | "teacher" }) {
  const namePrefix = role === "student" ? "مع المعلم" : "الطالب";
  const isCompleted = c.status === "completed";
  return (
    <Card className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium">
          {namePrefix} {c.other_name}
        </p>
        <p className="mt-0.5 text-sm text-muted" dir="rtl">
          {formatClassTime(c.start_time)}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        {isCompleted && c.overall_score != null && (
          <span className="rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-medium text-brand">
            التقييم {c.overall_score.toLocaleString("ar-EG")}٪
          </span>
        )}
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classStatusClass[c.status] ?? ""}`}>
          {classStatusLabel[c.status] ?? c.status}
        </span>
        {ACTIVE.has(c.status) && (
          <Link
            href={`/classes/${c.id}/live`}
            className={buttonClasses({ size: "sm", variant: "outline" })}
          >
            📖 المصحف المباشر
          </Link>
        )}
        {c.meet_link && ACTIVE.has(c.status) && (
          <a
            href={`/api/classes/${c.id}/join`}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ size: "sm", variant: role === "student" ? "primary" : "outline" })}
          >
            دخول الحصة
          </a>
        )}
        {role === "teacher" && (
          <Link href={`/teacher/classes/${c.id}/report`} className={buttonClasses({ size: "sm" })}>
            {isCompleted ? "عرض التقرير" : "تسجيل تقرير"}
          </Link>
        )}
      </div>
    </Card>
  );
}

export function ClassSchedule({ rows, role }: { rows: ScheduleRow[]; role: "student" | "teacher" }) {
  const { upcoming, past } = splitSchedule(rows);
  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-xl font-bold">
          الحصص القادمة
          {upcoming.length > 0 && (
            <span className="mr-2 text-sm font-normal text-muted">({upcoming.length.toLocaleString("ar-EG")})</span>
          )}
        </h2>
        {upcoming.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد حصص قادمة مجدولة حالياً.</Card>
        ) : (
          <div className="space-y-3">
            {upcoming.map((c) => (
              <ClassRow key={c.id} c={c} role={role} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl font-bold">
          الحصص السابقة
          {past.length > 0 && (
            <span className="mr-2 text-sm font-normal text-muted">({past.length.toLocaleString("ar-EG")})</span>
          )}
        </h2>
        {past.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد حصص سابقة بعد.</Card>
        ) : (
          <PastClassesTable rows={past} role={role} />
        )}
      </section>
    </div>
  );
}
