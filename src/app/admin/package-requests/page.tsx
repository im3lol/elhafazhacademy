import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { adminReviewRequest } from "@/lib/package-requests/actions";
import { finalStatusLabel, finalStatusClass, stepStatusLabel } from "@/lib/package-requests/config";
import { formatClassTime } from "@/lib/class-status";

type Req = {
  id: string;
  reason: string | null;
  teacher_status: string;
  teacher_note: string | null;
  admin_status: string;
  final_status: string;
  created_at: string;
  student_name: string;
  teacher_name: string | null;
  current_name: string | null;
  requested_name: string | null;
};

export default async function AdminPackageRequestsPage() {
  const requests = await sql<Req[]>`
    select r.id, r.reason, r.teacher_status, r.teacher_note, r.admin_status, r.final_status, r.created_at,
           s.full_name as student_name, t.full_name as teacher_name,
           cp.name as current_name, rp.name as requested_name
    from package_change_requests r
    join students s on s.id = r.student_id
    left join teachers t on t.id = r.teacher_id
    left join packages cp on cp.id = r.current_package_id
    left join packages rp on rp.id = r.requested_package_id
    order by (r.final_status = 'pending' and r.teacher_status = 'approved') desc, r.created_at desc`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">طلبات تغيير الباقات</h1>
        <p className="mt-1 text-muted">القرار النهائي وتطبيق التغيير.</p>
      </div>

      {requests.length === 0 && <Card className="text-sm text-muted">لا توجد طلبات.</Card>}

      <div className="space-y-3">
        {requests.map((r) => {
          const actionable = r.final_status === "pending" && r.teacher_status === "approved";
          const waitingTeacher = r.final_status === "pending" && r.teacher_status === "pending";
          return (
            <Card key={r.id} className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-base font-bold">{r.student_name}</p>
                  <p className="mt-1 text-sm">
                    {r.current_name ?? "—"} ← <span className="text-brand">{r.requested_name ?? "—"}</span>
                  </p>
                  <p className="mt-1 text-sm text-muted">
                    المعلم: {r.teacher_name ?? "—"} ({stepStatusLabel[r.teacher_status] ?? r.teacher_status})
                    {" · "}<span dir="rtl">{formatClassTime(r.created_at)}</span>
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${finalStatusClass[r.final_status] ?? ""}`}>
                  {finalStatusLabel[r.final_status] ?? r.final_status}
                </span>
              </div>
              {r.reason && <p className="text-sm text-muted">السبب: {r.reason}</p>}
              {r.teacher_note && <p className="text-sm text-muted">ملاحظة المعلم: {r.teacher_note}</p>}

              {actionable ? (
                <form action={adminReviewRequest} className="space-y-2 border-t border-border pt-3">
                  <input type="hidden" name="request_id" value={r.id} />
                  <Textarea name="note" placeholder="ملاحظة (اختياري)" className="min-h-16" />
                  <div className="flex gap-2">
                    <Button type="submit" name="decision" value="approve" size="sm">اعتماد وتطبيق</Button>
                    <Button type="submit" name="decision" value="reject" size="sm" variant="danger">رفض</Button>
                  </div>
                </form>
              ) : waitingTeacher ? (
                <p className="border-t border-border pt-3 text-xs text-muted">بانتظار موافقة المعلم أولاً.</p>
              ) : null}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
