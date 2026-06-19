import Link from "next/link";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { MISTAKE_TYPES, type MistakeType } from "@/lib/mushaf/data";

const ar = (n: number | string | null) => Number(n ?? 0).toLocaleString("ar-EG");

type Summary = { with_progress: number; open_notes: number; resolved_notes: number; students_with_notes: number };
type ByType = { mistake_type: MistakeType; n: number };
type TopStudent = { id: string; full_name: string; open_notes: number; page: number | null };

export default async function AdminMushafPage() {
  const [[sum], byType, top] = await Promise.all([
    sql<Summary[]>`
      select
        (select count(*) from student_mushaf_progress)::int as with_progress,
        (select count(*) from student_mushaf_mistakes where not is_resolved)::int as open_notes,
        (select count(*) from student_mushaf_mistakes where is_resolved)::int as resolved_notes,
        (select count(distinct student_id) from student_mushaf_mistakes where not is_resolved)::int as students_with_notes`,
    sql<ByType[]>`
      select mistake_type, count(*)::int as n
      from student_mushaf_mistakes where not is_resolved group by mistake_type`,
    sql<TopStudent[]>`
      select s.id, s.full_name, count(*)::int as open_notes,
        (select page_number from student_mushaf_progress p where p.student_id = s.id) as page
      from student_mushaf_mistakes m join students s on s.id = m.student_id
      where not m.is_resolved
      group by s.id, s.full_name order by open_notes desc limit 15`,
  ]);

  const byTypeMap = new Map(byType.map((r) => [r.mistake_type, r.n]));
  const stats = [
    { label: "طلاب لديهم آخر موضع", value: ar(sum?.with_progress) },
    { label: "ملاحظات مفتوحة", value: ar(sum?.open_notes), accent: true },
    { label: "ملاحظات مُعالَجة", value: ar(sum?.resolved_notes) },
    { label: "طلاب بحاجة لمراجعة", value: ar(sum?.students_with_notes) },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">متابعة المصحف</h1>
        <p className="mt-1 text-muted">نظرة عامة على ملاحظات المصحف الشخصي عبر الطلاب.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <p className="text-sm text-muted">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-black ${s.accent ? "text-brand" : ""}`}>{s.value}</p>
          </Card>
        ))}
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">الملاحظات المفتوحة حسب النوع</h2>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(Object.keys(MISTAKE_TYPES) as MistakeType[]).map((k) => (
            <Card key={k} className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm">
                <span className={`inline-block h-2.5 w-2.5 rounded-full ${MISTAKE_TYPES[k].dot}`} />
                {MISTAKE_TYPES[k].label}
              </span>
              <span className="font-display text-lg font-bold">{ar(byTypeMap.get(k) ?? 0)}</span>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">الأكثر حاجةً للمراجعة</h2>
        {top.length === 0 ? (
          <Card className="text-sm text-muted">لا ملاحظات مفتوحة حالياً.</Card>
        ) : (
          <Card className="overflow-x-auto p-0">
            <table className="w-full min-w-[520px] text-right text-sm">
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="p-3 font-medium">#</th>
                  <th className="p-3 font-medium">الطالب</th>
                  <th className="p-3 font-medium">آخر موضع</th>
                  <th className="p-3 font-medium">ملاحظات مفتوحة</th>
                </tr>
              </thead>
              <tbody>
                {top.map((t, i) => (
                  <tr key={t.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60">
                    <td className="p-3 text-muted tabular-nums">{ar(i + 1)}</td>
                    <td className="p-3 font-medium">
                      <Link href={`/admin/students/${t.id}`} className="hover:text-brand hover:underline">
                        {t.full_name}
                      </Link>
                    </td>
                    <td className="p-3 text-muted">{t.page ? `صفحة ${ar(t.page)}` : "—"}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-bold text-warning">
                        {ar(t.open_notes)} ملاحظة
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}
      </div>
    </div>
  );
}
