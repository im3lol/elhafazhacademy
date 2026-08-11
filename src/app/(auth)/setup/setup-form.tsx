"use client";

import { useActionState } from "react";
import { createFirstAdmin } from "@/lib/setup/actions";
import type { ActionState } from "@/lib/auth/actions";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function SetupForm() {
  const [state, formAction] = useActionState<ActionState, FormData>(createFirstAdmin, {});

  return (
    <form action={formAction} className="mt-6 space-y-4">
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Field label="الاسم الكامل" htmlFor="full_name" error={state.fieldErrors?.full_name} required>
        <Input id="full_name" name="full_name" placeholder="مدير الأكاديمية" autoComplete="name" />
      </Field>

      <Field label="البريد الإلكتروني" htmlFor="email" error={state.fieldErrors?.email} required>
        <Input id="email" name="email" type="email" dir="ltr" placeholder="you@example.com" autoComplete="email" />
      </Field>

      <Field
        label="كلمة المرور"
        htmlFor="password"
        error={state.fieldErrors?.password}
        hint="٨ أحرف على الأقل"
        required
      >
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>

      <Field label="تأكيد كلمة المرور" htmlFor="confirm" error={state.fieldErrors?.confirm} required>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </Field>

      <SubmitButton className="w-full" size="lg" pendingText="جارٍ الإنشاء…">
        إنشاء حساب الإدارة
      </SubmitButton>
    </form>
  );
}
