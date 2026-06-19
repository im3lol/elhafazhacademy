import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approveTeacher, rejectTeacher, setTeacherRate } from "@/lib/admin/teacher-review";
import { Pagination, parsePage } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

const statusLabel: Record<string, string> = {
  "Pending Review": "بانتظار المراجعة",
  Active: "نشط",
  Suspended: "موقوف",
  Rejected: "مرفوض",
};

type Row = {
  id: string;
  full_name: string;
  country: string | null;
  qualifications: string | null;
  experience_years: number | null;
  status: string;
  per_class_rate: string | null;
};

function egp(v: string | null) {
  return v == null ? "—" : `${Number(v).toLocaleString("ar-EG")} ج.م`;
}

export default async function AdminTeachersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const offset = (page - 1) * PAGE_SIZE;
  const [teachers, [{ total }]] = await Promise.all([
    sql<Row[]>`
      select id, full_name, country, qualifications, experience_years, status, per_class_rate
      from teachers order by created_at desc limit ${PAGE_SIZE} offset ${offset}`,
    sql<{ total: number }[]>`select count(*)::int as total from teachers`,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">المعلمون</h1>
        <p className="mt-1 text-muted">{Number(total).toLocaleString("ar-EG")} معلم مسجّل.</p>
      </div>

      {teachers.length === 0 ? (
        <Card className="text-sm text-muted">لا يوجد معلمون بعد.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[820px] text-right text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">المعلم</th>
                <th className="p-3 font-medium">الدولة</th>
                <th className="p-3 font-medium">الخبرة</th>
                <th className="p-3 font-medium">تكلفة الحصة</th>
                <th className="p-3 font-medium">الحالة</th>
                <th className="p-3 font-medium">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => {
                const pending = t.status === "Pending Review";
                const active = t.status === "Active";
                return (
                  <tr key={t.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="p-3">
                      <p className="font-medium">{t.full_name}</p>
                      {t.qualifications && (
                        <p className="mt-0.5 text-xs text-muted">{t.qualifications}</p>
                      )}
                    </td>
                    <td className="p-3 text-muted">{t.country ?? "—"}</td>
                    <td className="p-3 text-muted">
                      {t.experience_years != null ? `${t.experience_years} سنة` : "—"}
                    </td>
                    <td className="whitespace-nowrap p-3 font-bold text-brand">{active ? egp(t.per_class_rate) : "—"}</td>
                    <td className="p-3">
                      <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs font-medium text-muted">
                        {statusLabel[t.status] ?? t.status}
                      </span>
                    </td>
                    <td className="p-3">
                      {pending && (
                        <div className="flex flex-wrap items-end gap-2">
                          <form action={approveTeacher} className="flex items-end gap-1.5">
                            <input type="hidden" name="teacher_id" value={t.id} />
                            <Input name="per_class_rate" type="number" min={1} dir="ltr" required placeholder="التكلفة" className="h-9 w-28" />
                            <Button type="submit" size="sm">اعتماد</Button>
                          </form>
                          <form action={rejectTeacher}>
                            <input type="hidden" name="teacher_id" value={t.id} />
                            <Button type="submit" size="sm" variant="danger">رفض</Button>
                          </form>
                        </div>
                      )}
                      {active && (
                        <form action={setTeacherRate} className="flex items-end gap-1.5">
                          <input type="hidden" name="teacher_id" value={t.id} />
                          <Input
                            name="per_class_rate" type="number" min={1} dir="ltr" required
                            defaultValue={t.per_class_rate ?? ""} className="h-9 w-28"
                          />
                          <Button type="submit" size="sm" variant="outline">حفظ</Button>
                        </form>
                      )}
                      {!pending && !active && <span className="text-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Pagination basePath="/admin/teachers" page={page} pageSize={PAGE_SIZE} total={Number(total)} />
    </div>
  );
}
