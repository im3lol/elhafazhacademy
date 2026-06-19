import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { approvePayment, rejectPayment } from "@/lib/admin/payment-review";

const statusBadge: Record<string, { label: string; cls: string }> = {
  "Payment Under Review": { label: "قيد المراجعة", cls: "bg-warning/15 text-warning" },
  "Payment Approved": { label: "مقبول", cls: "bg-success/15 text-success" },
  "Payment Rejected": { label: "مرفوض", cls: "bg-danger/15 text-danger" },
  "Payment Uploaded": { label: "مرفوع", cls: "bg-info/15 text-info" },
};

type Row = {
  id: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  transaction_reference: string | null;
  proof_image_url: string | null;
  full_name: string | null;
  country: string | null;
};

export default async function AdminPaymentsPage() {
  const rows = await sql<Row[]>`
    select pay.id, pay.amount, pay.currency, pay.status, pay.created_at,
           pay.transaction_reference, pay.proof_image_url,
           s.full_name, s.country
    from payments pay join students s on s.id = pay.student_id
    order by pay.created_at desc`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">مراجعة المدفوعات</h1>
        <p className="mt-1 text-muted">راجع إثباتات التحويل وفعّل حسابات الطلاب.</p>
      </div>

      {rows.length === 0 && <Card className="text-sm text-muted">لا توجد مدفوعات بعد.</Card>}

      <div className="space-y-4">
        {rows.map((r) => {
          const badge = statusBadge[r.status] ?? { label: r.status, cls: "bg-surface text-muted" };
          const pending = r.status === "Payment Under Review";
          // المسار المخزَّن: payment-proofs/{userId}/{file} → نزيل البادئة لرابط الـ API
          const proofPath = r.proof_image_url?.replace(/^payment-proofs\//, "");
          return (
            <Card key={r.id} className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold">{r.full_name ?? "—"}</p>
                  <p className="text-sm text-muted">
                    {r.country ?? "—"} · {new Date(r.created_at).toLocaleDateString("ar-EG")}
                    {r.transaction_reference ? ` · مرجع: ${r.transaction_reference}` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${badge.cls}`}>{badge.label}</span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-sm">
                <span className="font-bold text-brand">{r.amount} {r.currency}</span>
                {proofPath ? (
                  <a
                    href={`/api/files/payment-proofs/${proofPath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    عرض إثبات التحويل ↗
                  </a>
                ) : (
                  <span className="text-muted">لا يوجد إثبات</span>
                )}
              </div>

              {pending && (
                <div className="flex flex-wrap items-end gap-3 border-t border-border pt-4">
                  <form action={approvePayment}>
                    <input type="hidden" name="payment_id" value={r.id} />
                    <Button type="submit" size="sm">قبول وتفعيل</Button>
                  </form>
                  <form action={rejectPayment} className="flex items-end gap-2">
                    <input type="hidden" name="payment_id" value={r.id} />
                    <Input name="reason" placeholder="سبب الرفض" className="h-9 w-48" />
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
