import Link from "next/link";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/field";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const token = (await searchParams).token ?? "";

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">تعيين كلمة مرور جديدة</h1>
      <p className="mt-1 text-sm text-muted">اختر كلمة مرور جديدة لحسابك.</p>

      {!token ? (
        <div className="mt-6 space-y-4">
          <FormMessage>الرابط غير صالح. اطلب رابط استرجاع جديداً.</FormMessage>
          <Link href="/forgot-password" className="block text-center text-sm font-medium text-brand hover:underline">
            طلب رابط جديد
          </Link>
        </div>
      ) : (
        <ResetPasswordForm token={token} />
      )}
    </Card>
  );
}
