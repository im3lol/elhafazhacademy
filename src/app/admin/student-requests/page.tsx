import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { approveStudentRequest, rejectStudentRequest } from "@/lib/student-requests/actions";
import { formatClassTime } from "@/lib/class-status";

const statusLabel: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-warning/15 text-warning" },
  admin_approved: { label: "تمت الموافقة", cls: "bg-success/15 text-success" },
  admin_rejected: { label: "مرفوض", cls: "bg-danger/15 text-danger" },
  cancelled: { label: "ملغى", cls: "bg-muted/15 text-muted" },
};

type Row = {
  id: string;
  status: string;
  created_at: string;
  teacher_name: string;
  student_name: string;
  student_level: string | null;
  student_has_teacher: boolean;
};

export default async function AdminStudentRequestsPage() {
  const requests = await sql<Row[]>`
    select r.id, r.status, r.created_at,
           t.full_name as teacher_name, s.full_name as student_name, s.current_level as student_level,
           (s.teacher_id is not null) as student_has_teacher
    from student_teacher_requests r
    join teachers t on t.id = r.teacher_id
    join students s on s.id = r.student_id
    order by (r.status = 'pending') desc, r.created_at desc`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">طلبات استقبال الطلاب</h1>
        <p className="mt-1 text-muted">وافق على طلبات المعلمين لتعيين الطلاب.</p>
      </div>

      {requests.length === 0 && <Card className="text-sm text-muted">لا توجد طلبات.</Card>}

      <div className="space-y-3">
        {requests.map((r) => {
          const st = statusLabel[r.status] ?? { label: r.status, cls: "" };
          const pending = r.status === "pending";
          return (
            <Card key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">
                    {r.teacher_name} <span className="text-muted">يطلب</span> {r.student_name}
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    مستوى الطالب: {r.student_level ?? "—"}
                    {" · "}<span dir="rtl">{formatClassTime(r.created_at)}</span>
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${st.cls}`}>{st.label}</span>
              </div>

              {pending && (
                <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
                  {r.student_has_teacher && (
                    <span className="text-xs text-warning">تنبيه: الطالب لديه معلم بالفعل.</span>
                  )}
                  <form action={approveStudentRequest} className="ms-auto">
                    <input type="hidden" name="request_id" value={r.id} />
                    <Button type="submit" size="sm">موافقة وتعيين</Button>
                  </form>
                  <form action={rejectStudentRequest}>
                    <input type="hidden" name="request_id" value={r.id} />
                    <Button type="submit" size="sm" variant="danger">رفض</Button>
                  </form>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
