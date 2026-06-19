import { Card } from "@/components/ui/card";
import { LineChart } from "@/components/admin/dashboard-charts";

export type ProgressReport = {
  created_at: string;
  overall_score: number | null;
  memorization_score: number | null;
  tajweed_score: number | null;
  fluency_score: number | null;
  commitment_score: number | null;
};

function ar(n: number) {
  return n.toLocaleString("ar-EG");
}
function avg(vals: (number | null)[]) {
  const xs = vals.filter((v): v is number => v != null);
  if (xs.length === 0) return null;
  return Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
}

type ScoreKey = "memorization_score" | "tajweed_score" | "fluency_score" | "commitment_score";
const SKILLS: { key: ScoreKey; label: string }[] = [
  { key: "memorization_score", label: "الحفظ" },
  { key: "tajweed_score", label: "التجويد" },
  { key: "fluency_score", label: "الطلاقة" },
  { key: "commitment_score", label: "الالتزام" },
];

export function ProgressOverview({
  reports,
  memorizedParts,
  currentLevel,
  mistakes,
}: {
  /** التقارير بترتيب زمني تصاعدي (الأقدم أولاً). */
  reports: ProgressReport[];
  memorizedParts: number;
  currentLevel: string | null;
  mistakes: { open: number; resolved: number; repeated: number };
}) {
  const scored = reports.filter((r) => r.overall_score != null);
  const overallAvg = avg(reports.map((r) => r.overall_score));

  // اتجاه: متوسط آخر ٣ مقابل ما قبلها
  const overalls = scored.map((r) => r.overall_score as number);
  const last3 = overalls.slice(-3);
  const prev = overalls.slice(0, -3);
  const trend =
    last3.length && prev.length ? Math.round(avg(last3)! - avg(prev)!) : 0;

  const kpis = [
    { label: "متوسط التقييم", value: overallAvg == null ? "—" : `${ar(overallAvg)}٪`, accent: "brand" as const },
    { label: "حصص مقيّمة", value: ar(scored.length), accent: "brand" as const },
    { label: "الأجزاء المحفوظة", value: ar(memorizedParts), accent: "gold" as const },
    { label: "أخطاء مفتوحة", value: ar(mistakes.open), accent: mistakes.open > 0 ? ("danger" as const) : ("brand" as const) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => {
          const color = k.accent === "gold" ? "text-gold" : k.accent === "danger" ? "text-danger" : "text-brand";
          return (
            <Card key={k.label}>
              <p className="text-sm text-muted">{k.label}</p>
              <p className={`mt-1 font-display text-2xl font-black tabular-nums ${color}`}>{k.value}</p>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">اتجاه التقييم العام</h2>
            {trend !== 0 && (
              <span
                className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  trend > 0 ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                }`}
              >
                {trend > 0 ? "▲" : "▼"} {ar(Math.abs(trend))}٪ آخر ٣ حصص
              </span>
            )}
          </div>
          {scored.length < 2 ? (
            <p className="text-sm text-muted">يظهر الرسم بعد تسجيل حصتين مقيّمتين على الأقل.</p>
          ) : (
            <>
              {/* عكس الاتجاه ليقرأ من اليمين (الأقدم) لليسار (الأحدث) — مناسب للعربية */}
              <LineChart data={[...scored].reverse().map((r) => ({ value: r.overall_score as number }))} />
              <div className="mt-2 flex justify-between text-xs text-muted">
                <span>الأقدم</span>
                <span>الأحدث</span>
              </div>
            </>
          )}
        </Card>

        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">متوسط المهارات</h2>
          {scored.length === 0 ? (
            <p className="text-sm text-muted">لا توجد تقييمات بعد.</p>
          ) : (
            <div className="space-y-3">
              {SKILLS.map((s) => {
                const v = avg(reports.map((r) => r[s.key]));
                return (
                  <div key={s.key}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span>{s.label}</span>
                      <span className="tabular-nums text-muted">{v == null ? "—" : `${ar(v)}٪`}</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-border">
                      <div className="h-full rounded-full bg-brand" style={{ width: `${v ?? 0}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {(currentLevel || mistakes.resolved > 0 || mistakes.repeated > 0) && (
        <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          {currentLevel && (
            <span>
              <span className="text-muted">المستوى الحالي: </span>
              <span className="font-medium">{currentLevel}</span>
            </span>
          )}
          <span>
            <span className="text-muted">أخطاء تم تجاوزها: </span>
            <span className="font-medium text-success">{ar(mistakes.resolved)}</span>
          </span>
          {mistakes.repeated > 0 && (
            <span>
              <span className="text-muted">أخطاء متكررة: </span>
              <span className="font-medium text-warning">{ar(mistakes.repeated)}</span>
            </span>
          )}
        </Card>
      )}
    </div>
  );
}
