import { Card } from "@/components/ui/card";
import { BarChart } from "@/components/admin/dashboard-charts";
import { PrintButton } from "@/components/student/print-button";
import type { StudentProgress } from "@/lib/student/progress";

const ar = (n: number) => n.toLocaleString("ar-EG");
const arDate = (s: string) => new Date(s).toLocaleDateString("ar-EG", { day: "numeric", month: "short", year: "numeric" });

/** عرض تقدّم الطالب (خريطة الحفظ + النشاط/التقييم الشهري + الإنجازات) — قابل لإعادة الاستخدام للطالب/المعلم/الأدمن. */
export function StudentProgressView({ data, studentName }: { data: StudentProgress; studentName?: string }) {
  const kpis = [
    { label: "الأجزاء المحفوظة", value: `${ar(data.memorized)} / ٣٠`, color: "text-gold" },
    { label: "إجمالي الحصص", value: ar(data.totalLessons), color: "text-brand" },
    { label: "أفضل تقييم", value: data.bestScore == null ? "—" : `${ar(data.bestScore)}٪`, color: "text-brand" },
    { label: "أخطاء تم تجاوزها", value: ar(data.resolved), color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end print:hidden">
        <PrintButton />
      </div>

      {/* ترويسة تظهر في النسخة المطبوعة فقط */}
      <div className="hidden print:block">
        <div className="flex items-center justify-between border-b-2 border-brand pb-2">
          <span className="font-display text-xl font-black text-brand">أكاديمية الحفظة</span>
          <span className="text-sm">تقرير التقدّم{studentName ? ` — ${studentName}` : ""}</span>
        </div>
        <p className="mt-1 text-xs text-muted">
          تاريخ الإصدار: {new Date().toLocaleDateString("ar-EG", { day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <p className="text-sm text-muted">{k.label}</p>
            <p className={`mt-1 font-display text-2xl font-black tabular-nums ${k.color}`}>{k.value}</p>
          </Card>
        ))}
      </div>

      {/* خريطة الحفظ */}
      <Card>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-lg font-bold">خريطة الحفظ</h2>
          <span className="text-sm text-muted">{ar(data.memorized)} من ٣٠ جزءاً</span>
        </div>
        <div className="grid grid-cols-10 gap-1.5 sm:gap-2">
          {Array.from({ length: 30 }, (_, i) => {
            const done = i < data.memorized;
            return (
              <div
                key={i}
                title={`الجزء ${ar(i + 1)}`}
                className={`grid aspect-square place-items-center rounded-md text-xs font-bold ${
                  done ? "bg-gold/25 text-gold ring-1 ring-gold/40" : "bg-surface text-muted/50"
                }`}
              >
                {ar(i + 1)}
              </div>
            );
          })}
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-border">
          <div className="h-full rounded-full bg-gold transition-all" style={{ width: `${(data.memorized / 30) * 100}%` }} />
        </div>
      </Card>

      {/* النشاط والتقييم الشهري */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">الحصص — آخر ٦ أشهر</h2>
          {data.totalLessons === 0 ? (
            <p className="text-sm text-muted">لا حصص مسجّلة بعد.</p>
          ) : (
            <BarChart data={data.months.map((m) => ({ label: m.label, value: m.n }))} />
          )}
        </Card>
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">متوسط التقييم الشهري</h2>
          {!data.hasMonthlyScores ? (
            <p className="text-sm text-muted">يظهر بعد تسجيل تقييمات.</p>
          ) : (
            <BarChart
              data={data.months.map((m) => ({ label: m.label, value: m.avg }))}
              format={(n) => `${ar(n)}٪`}
              barClassName="bg-gold"
            />
          )}
        </Card>
      </div>

      {/* الإنجازات */}
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold">الإنجازات</h2>
          <span className="rounded-full bg-brand-subtle px-3 py-0.5 text-sm font-bold text-brand">
            {ar(data.earnedCount)} / {ar(data.achievements.length)}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {data.achievements.map((a) => (
            <div
              key={a.key}
              className={`flex flex-col items-center gap-1 rounded-xl border p-3 text-center ${
                a.earned ? "border-gold/40 bg-gold-subtle/40" : "border-border opacity-50 grayscale"
              }`}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-medium">{a.title}</span>
              {a.earned && a.earnedAt && (
                <span className="text-[10px] text-muted" dir="rtl">{arDate(a.earnedAt)}</span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* الخط الزمني للإنجازات */}
      {data.timeline.length > 0 && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">سجلّ الإنجازات</h2>
          <ol className="space-y-4">
            {data.timeline.map((a, i) => (
              <li key={a.key} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="grid h-9 w-9 place-items-center rounded-full border border-gold/40 bg-gold-subtle text-lg">
                    {a.icon}
                  </span>
                  {i < data.timeline.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                </div>
                <div className="pb-1">
                  <p className="font-medium">{a.title}</p>
                  <p className="text-xs text-muted" dir="rtl">{a.earnedAt ? arDate(a.earnedAt) : ""}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
