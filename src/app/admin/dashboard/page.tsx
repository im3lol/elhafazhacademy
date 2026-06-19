import Link from "next/link";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { BarChart, StatusBars } from "@/components/admin/dashboard-charts";
import {
  IconUsers,
  IconUserPlus,
  IconWallet,
  IconVideo,
  IconLayers,
  IconChat,
} from "@/components/icons";

const AR_MONTHS = [
  "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
  "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر",
];
const AR_WEEKDAYS = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

function egp(v: string | number | null) {
  return `${Number(v ?? 0).toLocaleString("ar-EG")} ج.م`;
}
function num(v: string | number | null) {
  return Number(v ?? 0);
}

type Kpi = {
  students_total: string; students_active: string; students_suspended: string;
  teachers_total: string; teachers_active: string; teachers_pending: string;
  classes_today: string; classes_live: string; no_shows_month: string;
  revenue_month: string; payments_pending: string; dues_outstanding: string;
};
type Queue = {
  payments: string; teachers: string; student_requests: string;
  package_requests: string; complaints: string;
};
type MonthRow = { ym: string; total: string };
type DayRow = { day: string; n: string };
type StatusRow = { status: string; n: string };
type RecentStudent = { id: string; full_name: string; status: string; created_at: string };

const STUDENT_STATUS: Record<string, { label: string; bar: string }> = {
  Active: { label: "نشط", bar: "bg-success" },
  "Pending Payment": { label: "بانتظار الدفع", bar: "bg-warning" },
  "Payment Under Review": { label: "الدفع قيد المراجعة", bar: "bg-info" },
  Suspended: { label: "موقوف", bar: "bg-danger" },
  Cancelled: { label: "ملغى", bar: "bg-muted" },
  "Payment Rejected": { label: "مرفوض الدفع", bar: "bg-danger" },
};

export default async function AdminDashboard() {
  const [[kpi], [queue], months, days, statuses, recent] = await Promise.all([
    sql<Kpi[]>`
      select
        (select count(*) from students)::int as students_total,
        (select count(*) from students where status='Active')::int as students_active,
        (select count(*) from students where status='Suspended')::int as students_suspended,
        (select count(*) from teachers)::int as teachers_total,
        (select count(*) from teachers where status='Active')::int as teachers_active,
        (select count(*) from teachers where status='Pending Review')::int as teachers_pending,
        (select count(*) from classes
           where (start_time at time zone 'Africa/Cairo')::date = (now() at time zone 'Africa/Cairo')::date
             and status <> 'cancelled')::int as classes_today,
        (select count(*) from classes where status='live')::int as classes_live,
        (select count(*) from classes where status in ('no_show_student','no_show_teacher')
           and start_time >= date_trunc('month', now()))::int as no_shows_month,
        (select coalesce(sum(amount),0) from payments
           where status='Payment Approved' and created_at >= date_trunc('month', now())) as revenue_month,
        (select count(*) from payments
           where status in ('Payment Uploaded','Payment Under Review','Need More Info'))::int as payments_pending,
        (select coalesce(sum(amount),0) from teacher_earnings where status in ('pending','approved')) as dues_outstanding`,
    sql<Queue[]>`
      select
        (select count(*) from payments where status in ('Payment Uploaded','Payment Under Review','Need More Info'))::int as payments,
        (select count(*) from teachers where status='Pending Review')::int as teachers,
        (select count(*) from student_teacher_requests where status='pending')::int as student_requests,
        (select count(*) from package_change_requests where final_status='pending')::int as package_requests,
        (select count(*) from complaints where status in ('Open','In Progress','Waiting For User'))::int as complaints`,
    sql<MonthRow[]>`
      select to_char(m, 'YYYY-MM') as ym, coalesce(sum(p.amount),0) as total
      from generate_series(date_trunc('month', now()) - interval '5 months',
                           date_trunc('month', now()), interval '1 month') m
      left join payments p
        on date_trunc('month', p.created_at) = m and p.status='Payment Approved'
      group by m order by m`,
    sql<DayRow[]>`
      select to_char(d, 'YYYY-MM-DD') as day, count(c.id)::int as n
      from generate_series((now() at time zone 'Africa/Cairo')::date - interval '6 days',
                           (now() at time zone 'Africa/Cairo')::date, interval '1 day') d
      left join classes c
        on (c.start_time at time zone 'Africa/Cairo')::date = d::date and c.status <> 'cancelled'
      group by d order by d`,
    sql<StatusRow[]>`select status, count(*)::int as n from students group by status order by n desc`,
    sql<RecentStudent[]>`
      select id, full_name, status, created_at from students order by created_at desc limit 5`,
  ]);

  const kpiCards = [
    { label: "إيرادات الشهر", value: egp(kpi?.revenue_month), icon: IconWallet, accent: "gold" as const },
    { label: "الطلاب النشطون", value: `${num(kpi?.students_active).toLocaleString("ar-EG")} / ${num(kpi?.students_total).toLocaleString("ar-EG")}`, icon: IconUsers, accent: "brand" as const },
    { label: "المعلمون النشطون", value: `${num(kpi?.teachers_active).toLocaleString("ar-EG")} / ${num(kpi?.teachers_total).toLocaleString("ar-EG")}`, icon: IconUserPlus, accent: "brand" as const },
    { label: "حصص اليوم", value: num(kpi?.classes_today).toLocaleString("ar-EG"), icon: IconVideo, accent: "brand" as const },
    { label: "مستحقات قائمة", value: egp(kpi?.dues_outstanding), icon: IconWallet, accent: "brand" as const },
    { label: "غياب هذا الشهر", value: num(kpi?.no_shows_month).toLocaleString("ar-EG"), icon: IconVideo, accent: num(kpi?.no_shows_month) > 0 ? ("danger" as const) : ("brand" as const) },
  ];

  const queues = [
    { label: "مدفوعات بانتظار المراجعة", count: num(queue?.payments), href: "/admin/payments", icon: IconWallet },
    { label: "معلمون بانتظار الاعتماد", count: num(queue?.teachers), href: "/admin/teachers", icon: IconUserPlus },
    { label: "طلبات استقبال طلاب", count: num(queue?.student_requests), href: "/admin/student-requests", icon: IconUsers },
    { label: "طلبات تغيير الباقة", count: num(queue?.package_requests), href: "/admin/package-requests", icon: IconLayers },
    { label: "شكاوى مفتوحة", count: num(queue?.complaints), href: "/admin/complaints", icon: IconChat },
  ];
  const totalPending = queues.reduce((s, q) => s + q.count, 0);

  const revenueData = months.map((m) => {
    const month = Number(m.ym.slice(5, 7)) - 1;
    return { label: AR_MONTHS[month] ?? m.ym, value: num(m.total) };
  });
  const classData = days.map((d) => {
    const wd = new Date(d.day + "T00:00:00").getDay();
    return { label: AR_WEEKDAYS[wd] ?? d.day, value: num(d.n) };
  });
  const statusData = statuses.map((s) => ({
    label: STUDENT_STATUS[s.status]?.label ?? s.status,
    value: num(s.n),
    barClassName: STUDENT_STATUS[s.status]?.bar ?? "bg-brand",
  }));

  return (
    <div className="space-y-7">
      <div>
        <h1 className="font-display text-3xl font-black">لوحة الإدارة</h1>
        <p className="mt-1 text-muted">نظرة عامة على أداء الأكاديمية.</p>
      </div>

      {/* مؤشرات الأداء */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpiCards.map((c) => {
          const Icon = c.icon;
          const accent =
            c.accent === "gold" ? "text-gold" : c.accent === "danger" ? "text-danger" : "text-brand";
          const bg =
            c.accent === "gold" ? "bg-gold/10 text-gold" : c.accent === "danger" ? "bg-danger/10 text-danger" : "bg-brand/10 text-brand";
          return (
            <Card key={c.label} className="flex items-center gap-4">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${bg}`}>
                <Icon className="h-6 w-6" />
              </span>
              <div className="min-w-0">
                <p className="text-sm text-muted">{c.label}</p>
                <p className={`mt-0.5 font-display text-2xl font-black tabular-nums ${accent}`}>{c.value}</p>
              </div>
            </Card>
          );
        })}
      </div>

      {/* طوابير العمل */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-bold">يحتاج إجراءً منك</h2>
          {totalPending > 0 && (
            <span className="rounded-full bg-warning/15 px-3 py-1 text-sm font-medium text-warning">
              {totalPending.toLocaleString("ar-EG")} عنصر معلّق
            </span>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {queues.map((q) => {
            const Icon = q.icon;
            const has = q.count > 0;
            return (
              <Link
                key={q.href}
                href={q.href}
                className={`flex items-center justify-between gap-3 rounded-2xl border p-4 transition-colors ${
                  has ? "border-brand/30 bg-brand-subtle/40 hover:bg-brand-subtle" : "border-border bg-surface hover:bg-background"
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className={`h-5 w-5 ${has ? "text-brand" : "text-muted"}`} />
                  <span className="text-sm font-medium">{q.label}</span>
                </span>
                <span
                  className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-sm font-bold tabular-nums ${
                    has ? "bg-brand text-brand-foreground" : "bg-border text-muted"
                  }`}
                >
                  {q.count.toLocaleString("ar-EG")}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* الرسوم البيانية */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">الإيرادات — آخر ٦ أشهر</h2>
          <BarChart data={revenueData} format={(n) => (n >= 1000 ? `${Math.round(n / 1000)}k` : n.toLocaleString("ar-EG"))} barClassName="bg-gold" />
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">الحصص — آخر ٧ أيام</h2>
          <BarChart data={classData} barClassName="bg-brand" />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">توزيع حالات الطلاب</h2>
          {statusData.length === 0 ? (
            <p className="text-sm text-muted">لا يوجد طلاب بعد.</p>
          ) : (
            <StatusBars data={statusData} />
          )}
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">أحدث الطلاب</h2>
            <Link href="/admin/students" className="text-sm font-medium text-brand hover:underline">
              عرض الكل
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-sm text-muted">لا يوجد طلاب مسجّلون بعد.</p>
          ) : (
            <ul className="divide-y divide-border">
              {recent.map((s) => (
                <li key={s.id} className="flex items-center justify-between gap-3 py-2.5">
                  <span className="truncate text-sm font-medium">{s.full_name}</span>
                  <span className="shrink-0 text-xs text-muted">
                    {STUDENT_STATUS[s.status]?.label ?? s.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
