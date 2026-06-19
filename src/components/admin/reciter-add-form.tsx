"use client";

import { useActionState } from "react";
import { addReciter, type ReciterFormState } from "@/lib/admin/reciters-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReciterAddForm() {
  const [state, action, pending] = useActionState<ReciterFormState, FormData>(addReciter, {});
  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Input name="name_ar" placeholder="اسم القارئ (عربي)" required />
        <Input name="name_en" placeholder="الاسم (إنجليزي) — اختياري" dir="ltr" />
        <Input name="source" placeholder="معرّف التلاوة (رقم)" dir="ltr" required />
      </div>
      <p className="text-xs text-muted">
        المصدر هو معرّف التلاوة الرقمي من quran.com (يوفّر توقيتات الكلمات) — مثل <span dir="ltr">6</span> للحصري، <span dir="ltr">7</span> للعفاسي.
      </p>
      {state.error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{state.error}</p>}
      {state.success && <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{state.success}</p>}
      <Button type="submit" size="sm" disabled={pending}>{pending ? "إضافة…" : "إضافة قارئ"}</Button>
    </form>
  );
}
