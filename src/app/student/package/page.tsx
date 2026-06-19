import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PackageRequestForm } from "@/components/student/package-request-form";
import { cancelPackageRequest } from "@/lib/package-requests/actions";
import { finalStatusLabel, finalStatusClass, stepStatusLabel } from "@/lib/package-requests/config";
import { formatClassTime } from "@/lib/class-status";

type Pkg = { id: string; name: string; price: string; currency: string };
type Current = { package_name: string | null; classes_per_month: number | null; price: string | null; currency: string | null };
type Req = {
  id: string;
  reason: string | null;
  teacher_status: string;
  admin_status: string;
  final_status: string;
  created_at: string;
  requested_name: string | null;
  current_name: string | null;
};

export default async function StudentPackagePage() {
  const user = await getSessionUser();

  const [[current], packages, requests] = await Promise.all([
    sql<Current[]>`
      select p.name as package_name, p.classes_per_month, p.price, p.currency
      from students s left join packages p on p.id = s.package_id
      where s.user_id = ${user!.id} limit 1`,
    sql<Pkg[]>`select id, name, price, currency from packages where is_active = true order by price`,
    sql<Req[]>`
      select r.id, r.reason, r.teacher_status, r.admin_status, r.final_status, r.created_at,
             rp.name as requested_name, cp.name as current_name
      from package_change_requests r
      join students s on s.id = r.student_id
      left join packages rp on rp.id = r.requested_package_id
      left join packages cp on cp.id = r.current_package_id
      where s.user_id = ${user!.id}
      order by r.created_at desc`,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الباقة</h1>
        <p className="mt-1 text-muted">باقتك الحالية وطلبات التغيير.</p>
      </div>

      <Card className="space-y-1">
        <p className="text-sm text-muted">باقتك الحالية</p>
        <p className="font-display text-2xl font-bold">{current?.package_name ?? "لا توجد باقة"}</p>
        {current?.package_name && (
          <p className="text-sm text-muted">
            {current.classes_per_month} حصة شهرياً · {Number(current.price).toLocaleString("ar-EG")} {current.currency}
          </p>
        )}
      </Card>

      <PackageRequestForm packages={packages} />

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">طلباتي</h2>
        {requests.length === 0 ? (
          <Card className="text-sm text-muted">لا توجد طلبات.</Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id} className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {r.current_name ?? "—"} ← <span className="text-brand">{r.requested_name ?? "—"}</span>
                    </p>
                    <p className="mt-1 text-sm text-muted" dir="rtl">{formatClassTime(r.created_at)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${finalStatusClass[r.final_status] ?? ""}`}>
                    {finalStatusLabel[r.final_status] ?? r.final_status}
                  </span>
                </div>
                {r.reason && <p className="text-sm text-muted">السبب: {r.reason}</p>}
                <div className="flex flex-wrap items-center gap-4 border-t border-border pt-3 text-xs text-muted">
                  <span>المعلم: {stepStatusLabel[r.teacher_status] ?? r.teacher_status}</span>
                  <span>الإدارة: {stepStatusLabel[r.admin_status] ?? r.admin_status}</span>
                  {r.final_status === "pending" && (
                    <form action={cancelPackageRequest} className="ms-auto">
                      <input type="hidden" name="request_id" value={r.id} />
                      <Button type="submit" variant="ghost" size="sm">إلغاء الطلب</Button>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
