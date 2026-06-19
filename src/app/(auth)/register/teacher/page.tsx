"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerTeacher, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/card";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export default function TeacherRegisterPage() {
  const [state, formAction] = useActionState<ActionState, FormData>(
    registerTeacher,
    {},
  );
  const e = state.fieldErrors ?? {};

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">التسجيل كمعلم</h1>
      <p className="mt-1 text-sm text-muted">
        انضم لفريق معلمي أكاديمية الحفظة. حسابك يُراجع قبل التفعيل.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        {state.error && <FormMessage>{state.error}</FormMessage>}

        <Field label="الاسم الكامل" htmlFor="full_name" error={e.full_name} required>
          <Input id="full_name" name="full_name" placeholder="الاسم الثلاثي" />
        </Field>

        <Field label="البريد الإلكتروني" htmlFor="email" error={e.email} required>
          <Input id="email" name="email" type="email" dir="ltr" placeholder="you@example.com" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="رقم الهاتف" htmlFor="phone" error={e.phone} required>
            <Input id="phone" name="phone" dir="ltr" inputMode="tel" placeholder="+20…" />
          </Field>
          <Field label="واتساب" htmlFor="whatsapp" error={e.whatsapp} hint="اختياري">
            <Input id="whatsapp" name="whatsapp" dir="ltr" inputMode="tel" placeholder="+20…" />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="الدولة" htmlFor="country" error={e.country} required>
            <Input id="country" name="country" placeholder="مصر" />
          </Field>
          <Field label="المدينة" htmlFor="city" error={e.city} hint="اختياري">
            <Input id="city" name="city" placeholder="القاهرة" />
          </Field>
        </div>

        <Field label="المؤهلات" htmlFor="qualifications" error={e.qualifications} required>
          <Input id="qualifications" name="qualifications" placeholder="مثال: إجازة في القراءات، بكالوريوس…" />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="سنوات الخبرة" htmlFor="experience_years" error={e.experience_years}>
            <Input id="experience_years" name="experience_years" type="number" min={0} max={60} dir="ltr" />
          </Field>
          <Field label="الإجازات" htmlFor="ijazat" error={e.ijazat} hint="اختياري">
            <Input id="ijazat" name="ijazat" placeholder="حفص عن عاصم…" />
          </Field>
        </div>

        <Field label="نبذة تعريفية" htmlFor="bio" error={e.bio} hint="اختياري">
          <Textarea id="bio" name="bio" placeholder="تحدّث عن خبرتك ومنهجك في التدريس…" />
        </Field>

        <Field label="كلمة المرور" htmlFor="password" error={e.password} hint="٦ أحرف على الأقل" required>
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </Field>

        <SubmitButton className="w-full" size="lg" pendingText="جارٍ إرسال الطلب…">
          إرسال طلب الانضمام
        </SubmitButton>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        لديك حساب؟{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          تسجيل الدخول
        </Link>
      </p>
    </Card>
  );
}
