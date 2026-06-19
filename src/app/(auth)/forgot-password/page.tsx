"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPassword, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export default function ForgotPasswordPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    forgotPassword,
    {},
  );

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">استعادة كلمة المرور</h1>
      <p className="mt-1 text-sm text-muted">
        أدخل بريدك وسنرسل لك رابط إعادة التعيين.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {state.error && <FormMessage>{state.error}</FormMessage>}
        {state.success && <FormMessage type="success">{state.success}</FormMessage>}

        <Field label="البريد الإلكتروني" htmlFor="email" error={state.fieldErrors?.email} required>
          <Input id="email" name="email" type="email" dir="ltr" placeholder="you@example.com" />
        </Field>

        <SubmitButton className="w-full" size="lg" pendingText="جارٍ الإرسال…">
          إرسال الرابط
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        <Link href="/login" className="font-medium text-brand hover:underline">
          العودة لتسجيل الدخول
        </Link>
      </p>
    </Card>
  );
}
