import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";
import { ClassScheduler } from "@/components/admin/class-scheduler";
import { cancelClass, rescheduleClass } from "@/lib/admin/class-actions";
import { classStatusLabel, classStatusClass, formatClassTime } from "@/lib/class-status";
import { Pagination, parsePage } from "@/components/ui/pagination";

const PAGE_SIZE = 30;

type Opt = { id: string; full_name: string };
type ClassRow = {
  id: string;
  start_time: string;
  status: string;
  meet_link: string | null;
  student_name: string;
  teacher_name: string;
};
type LiveRow = {
  id: string;
  start_time: string;
  meet_link: string | null;
  student_name: string;
  teacher_name: string;
  s_joined: boolean;
  t_joined: boolean;
};

export default async function AdminClassesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const offset = (page - 1) * PAGE_SIZE;
  const [students, teachers, classes, [{ total }], live] = await Promise.all([
    sql<Opt[]>`select id, full_name from students where status = 'Active' order by full_name`,
    sql<Opt[]>`select id, full_name from teachers where status = 'Active' order by full_name`,
    sql<ClassRow[]>`
      select c.id, c.start_time, c.status, c.meet_link,
             s.full_name as student_name, t.full_name as teacher_name
      from classes c
      join students s on s.id = c.student_id
      join teachers t on t.id = c.teacher_id
      order by c.start_time desc limit ${PAGE_SIZE} offset ${offset}`,
    sql<{ total: number }[]>`select count(*)::int as total from classes`,
    sql<LiveRow[]>`
      select c.id, c.start_time, c.meet_link,
             s.full_name as student_name, t.full_name as teacher_name,
             (c.student_join_clicked_at is not null) as s_joined,
             (c.teacher_join_clicked_at is not null) as t_joined
      from classes c
      join students s on s.id = c.student_id
      join teachers t on t.id = c.teacher_id
      where c.status = 'live'
      order by c.start_time`,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">إدارة الحصص</h1>
        <p className="mt-1 text-muted">جدول حصص القرآن وتابع حالتها.</p>
      </div>

      {live.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-xl font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-success" />
            </span>
            مباشر الآن
            <span className="text-sm font-normal text-muted">({live.length.toLocaleString("ar-EG")})</span>
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {live.map((c) => (
              <Card key={c.id} className="border-success/30 bg-success/5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold">{c.student_name}</p>
                    <p className="text-sm text-muted">مع {c.teacher_name}</p>
                    <p className="mt-1 text-xs text-muted" dir="rtl">بدأت: {formatClassTime(c.start_time)}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {c.meet_link && (
                      <a
                        href={`/api/classes/${c.id}/join`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClasses({ size: "sm" })}
                      >
                        دخول للمراقبة
                      </a>
                    )}
                    <a href={`/classes/${c.id}/live`} className={buttonClasses({ size: "sm", variant: "outline" })}>
                      📖 المصحف المباشر
                    </a>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3 text-xs">
                  <span className={`rounded-full px-2.5 py-0.5 font-medium ${c.t_joined ? "bg-success/15 text-success" : "bg-muted/15 text-muted"}`}>
                    المعلم: {c.t_joined ? "متصل" : "لم ينضم"}
                  </span>
                  <span className={`rounded-full px-2.5 py-0.5 font-medium ${c.s_joined ? "bg-success/15 text-success" : "bg-muted/15 text-muted"}`}>
                    الطالب: {c.s_joined ? "متصل" : "لم ينضم"}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      <ClassScheduler students={students} teachers={teachers} />

      {students.length === 0 && (
        <Card className="text-sm text-muted">
          لا يوجد طلاب نشطون بعد. فعّل دفع طالب أولاً لتتمكن من جدولة حصصه.
        </Card>
      )}

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="p-4 font-medium">الطالب</th>
              <th className="p-4 font-medium">المعلم</th>
              <th className="p-4 font-medium">الموعد</th>
              <th className="p-4 font-medium">الحالة</th>
              <th className="p-4 font-medium">الرابط</th>
              <th className="p-4 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {classes.map((c) => {
              const active = !["completed", "cancelled"].includes(c.status);
              return (
                <tr key={c.id} className="border-b border-border/60 last:border-0">
                  <td className="p-4 font-medium">{c.student_name}</td>
                  <td className="p-4 text-muted">{c.teacher_name}</td>
                  <td className="p-4 text-muted" dir="rtl">{formatClassTime(c.start_time)}</td>
                  <td className="p-4">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${classStatusClass[c.status] ?? ""}`}>
                      {classStatusLabel[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="p-4">
                    {c.meet_link ? (
                      <a href={c.meet_link} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">
                        Meet ↗
                      </a>
                    ) : (
                      <span className="text-muted">—</span>
                    )}
                  </td>
                  <td className="p-4">
                    {active && (
                      <div className="flex flex-col items-start gap-2 lg:flex-row lg:items-center">
                        <form action={rescheduleClass} className="flex items-center gap-1">
                          <input type="hidden" name="id" value={c.id} />
                          <input
                            type="datetime-local"
                            name="start_time"
                            dir="ltr"
                            required
                            className="h-9 rounded-lg border border-input bg-background px-2 text-xs text-foreground"
                          />
                          <Button type="submit" variant="outline" size="sm">إعادة جدولة</Button>
                        </form>
                        <form action={cancelClass}>
                          <input type="hidden" name="id" value={c.id} />
                          <Button type="submit" variant="ghost" size="sm">إلغاء</Button>
                        </form>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
            {classes.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-muted">لا توجد حصص مجدولة بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Pagination basePath="/admin/classes" page={page} pageSize={PAGE_SIZE} total={Number(total)} />
    </div>
  );
}
