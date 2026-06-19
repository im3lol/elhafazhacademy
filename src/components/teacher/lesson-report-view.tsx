import { Card } from "@/components/ui/card";

const lessonTypeLabel: Record<string, string> = {
  memorization: "حفظ",
  revision: "مراجعة",
  tajweed: "تجويد",
  test: "اختبار",
};
const catLabel: Record<string, string> = {
  memorization: "حفظ",
  tajweed: "تجويد",
  pronunciation: "نطق",
};
const sevLabel: Record<string, { label: string; cls: string }> = {
  low: { label: "منخفض", cls: "bg-info/15 text-info" },
  medium: { label: "متوسط", cls: "bg-warning/15 text-warning" },
  high: { label: "عالٍ", cls: "bg-danger/15 text-danger" },
};
const mistakeStatus: Record<string, string> = {
  new: "جديد",
  repeated: "متكرر",
  improving: "يتحسّن",
  resolved: "تم تجاوزه",
};

const ar = (n: number | null) => (n == null ? "—" : n.toLocaleString("ar-EG"));

export type ReportDetail = {
  lesson_type: string | null;
  surah_name: string | null;
  ayah_from: number | null;
  ayah_to: number | null;
  memorization_score: number | null;
  tajweed_score: number | null;
  fluency_score: number | null;
  commitment_score: number | null;
  overall_score: number | null;
  teacher_notes: string | null;
  homework: string | null;
};
export type ReportMistake = {
  id: string;
  mistake_category: string;
  mistake_type: string;
  surah_name: string | null;
  ayah_number: number | null;
  severity: string;
  status: string;
  description: string | null;
};

function ScoreBar({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-muted">{label}</span>
        <span className="font-bold tabular-nums">{ar(value)}٪</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-brand" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}

export function LessonReportView({ report, mistakes }: { report: ReportDetail; mistakes: ReportMistake[] }) {
  const range =
    report.ayah_from != null
      ? `${report.surah_name ?? ""} (${ar(report.ayah_from)}${report.ayah_to != null ? ` – ${ar(report.ayah_to)}` : ""})`
      : report.surah_name ?? "—";

  return (
    <div className="space-y-5">
      <Card className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs text-muted">المقطع</p>
            <p className="mt-0.5 font-display text-lg font-bold">{range}</p>
            <p className="mt-0.5 text-sm text-muted">
              نوع الحصة: {lessonTypeLabel[report.lesson_type ?? ""] ?? report.lesson_type ?? "—"}
            </p>
          </div>
          <span className="rounded-full bg-brand-subtle px-4 py-2 font-display text-lg font-black text-brand">
            {ar(report.overall_score)}٪
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <ScoreBar label="الحفظ" value={report.memorization_score} />
          <ScoreBar label="التجويد" value={report.tajweed_score} />
          <ScoreBar label="الطلاقة" value={report.fluency_score} />
          <ScoreBar label="الالتزام" value={report.commitment_score} />
        </div>
      </Card>

      {(report.teacher_notes || report.homework) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {report.teacher_notes && (
            <Card>
              <p className="mb-1 text-xs text-muted">ملاحظات المعلم</p>
              <p className="whitespace-pre-wrap text-sm">{report.teacher_notes}</p>
            </Card>
          )}
          {report.homework && (
            <Card className="border-gold/30 bg-gold-subtle/30">
              <p className="mb-1 text-xs text-muted">واجب الحصة القادمة</p>
              <p className="whitespace-pre-wrap text-sm">{report.homework}</p>
            </Card>
          )}
        </div>
      )}

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">
          الأخطاء المسجّلة
          {mistakes.length > 0 && (
            <span className="mr-2 text-sm font-normal text-muted">({ar(mistakes.length)})</span>
          )}
        </h2>
        {mistakes.length === 0 ? (
          <Card className="text-sm text-muted">لا أخطاء مسجّلة في هذه الحصة.</Card>
        ) : (
          <div className="space-y-2">
            {mistakes.map((m) => {
              const sev = sevLabel[m.severity] ?? { label: m.severity, cls: "" };
              return (
                <Card key={m.id} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="text-muted">{catLabel[m.mistake_category] ?? m.mistake_category}: </span>
                      {m.mistake_type}
                      {m.surah_name ? ` — ${m.surah_name}` : ""}
                      {m.ayah_number ? ` (${ar(m.ayah_number)})` : ""}
                    </p>
                    {m.description && <p className="mt-0.5 text-xs text-muted">{m.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${sev.cls}`}>{sev.label}</span>
                    <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">
                      {mistakeStatus[m.status] ?? m.status}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
