import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getSetting, ACADEMY_PAYMENT_KEY, type AcademyPayment } from "@/lib/settings";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/field";
import { PaymentUploadForm } from "@/components/student/payment-upload-form";

type StudentRow = {
  status: string;
  package_name: string | null;
  package_price: number | null;
  package_currency: string | null;
};
type PaymentRow = { status: string; rejection_reason: string | null };

export default async function StudentPaymentPage() {
  const user = await getSessionUser();

  const [student] = await sql<StudentRow[]>`
    select s.status, p.name as package_name, p.price as package_price, p.currency as package_currency
    from students s left join packages p on p.id = s.package_id
    where s.user_id = ${user!.id} limit 1`;

  const [lastPayment] = await sql<PaymentRow[]>`
    select pay.status, pay.rejection_reason
    from payments pay join students s on s.id = pay.student_id
    where s.user_id = ${user!.id}
    order by pay.created_at desc limit 1`;

  const pay = await getSetting<AcademyPayment>(ACADEMY_PAYMENT_KEY);

  const activated = student?.status === "Active";
  const underReview = lastPayment?.status === "Payment Under Review";
  const rejected = lastPayment?.status === "Payment Rejected";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">تفعيل الحساب — إثبات الدفع</h1>
        <p className="mt-1 text-muted">حوّل قيمة الباقة وارفع إثبات التحويل لتفعيل حسابك.</p>
      </div>

      {activated && <FormMessage type="success">حسابك مفعّل. شكراً لك!</FormMessage>}
      {underReview && (
        <FormMessage type="success">تم استلام إثبات الدفع وهو قيد المراجعة من الإدارة.</FormMessage>
      )}
      {rejected && (
        <FormMessage>
          تم رفض إثبات الدفع السابق{lastPayment?.rejection_reason ? `: ${lastPayment.rejection_reason}` : ""}.
          يرجى رفع إثبات صحيح.
        </FormMessage>
      )}

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">بيانات التحويل</h2>
        <dl className="space-y-2 text-sm">
          {pay?.method_label && (
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">المحفظة / البنك</dt>
              <dd className="font-medium">{pay.method_label}</dd>
            </div>
          )}
          {pay?.account_number && (
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">رقم الحساب</dt>
              <dd className="font-medium" dir="ltr">{pay.account_number}</dd>
            </div>
          )}
          {pay?.account_holder && (
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">صاحب الحساب</dt>
              <dd className="font-medium">{pay.account_holder}</dd>
            </div>
          )}
          {!pay?.account_number && (
            <div className="flex justify-between border-b border-border pb-2">
              <dt className="text-muted">المحفظة / الحساب</dt>
              <dd className="text-muted">سيتم التواصل معك من الإدارة بتفاصيل التحويل.</dd>
            </div>
          )}
          <div className="flex justify-between border-b border-border pb-2">
            <dt className="text-muted">الباقة</dt>
            <dd className="font-medium">{student?.package_name ?? "—"}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted">المبلغ</dt>
            <dd className="font-bold text-brand">
              {student?.package_price ? `${student.package_price} ${student.package_currency ?? "EGP"}` : "—"}
            </dd>
          </div>
        </dl>
        {pay?.instructions && (
          <p className="rounded-xl bg-gold-subtle px-3 py-2 text-sm text-gold-foreground">{pay.instructions}</p>
        )}
      </Card>

      {!activated && !underReview && (
        <Card>
          <h2 className="mb-4 font-display text-lg font-bold">رفع إثبات الدفع</h2>
          <PaymentUploadForm />
        </Card>
      )}
    </div>
  );
}
