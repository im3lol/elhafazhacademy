"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export default function LoginPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(login, {});

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">تسجيل الدخول</h1>
      <p className="mt-1 text-sm text-muted">
        أهلاً بعودتك إلى أكاديمية الحفظة.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {state.error && <FormMessage>{state.error}</FormMessage>}

        <Field label="البريد الإلكتروني" htmlFor="email" error={state.fieldErrors?.email} required>
          <Input id="email" name="email" type="email" dir="ltr" placeholder="you@example.com" autoComplete="email" />
        </Field>

        <Field label="كلمة المرور" htmlFor="password" error={state.fieldErrors?.password} required>
          <Input id="password" name="password" type="password" autoComplete="current-password" />
        </Field>

        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-sm text-brand hover:underline">
            نسيت كلمة المرور؟
          </Link>
        </div>

        <SubmitButton className="w-full" size="lg" pendingText="جارٍ الدخول…">
          دخول
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        ليس لديك حساب؟{" "}
        <Link href="/register/student" className="font-medium text-brand hover:underline">
          سجّل كطالب
        </Link>{" "}
        أو{" "}
        <Link href="/register/teacher" className="font-medium text-brand hover:underline">
          كمعلم
        </Link>
      </p>
    </Card>
  );
}
