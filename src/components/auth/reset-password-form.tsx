"use client";

import Link from "next/link";
import { useActionState } from "react";
import { resetPassword, type ActionState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, formAction] = useActionState<ActionState, FormData>(resetPassword, {});

  if (state.success) {
    return (
      <div className="space-y-4">
        <FormMessage type="success">{state.success}</FormMessage>
        <Link href="/login" className="block text-center text-sm font-medium text-brand hover:underline">
          تسجيل الدخول
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <input type="hidden" name="token" value={token} />
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Field label="كلمة المرور الجديدة" htmlFor="new_password" error={state.fieldErrors?.new_password} hint="٨ أحرف على الأقل" required>
        <Input id="new_password" name="new_password" type="password" />
      </Field>
      <Field label="تأكيد كلمة المرور" htmlFor="confirm_password" error={state.fieldErrors?.confirm_password} required>
        <Input id="confirm_password" name="confirm_password" type="password" />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText="جارٍ الحفظ…">
        تعيين كلمة المرور
      </SubmitButton>
    </form>
  );
}
