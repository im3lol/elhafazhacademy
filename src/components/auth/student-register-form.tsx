"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerStudent, type ActionState } from "@/lib/auth/actions";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Package = { id: string; name: string; price: number; currency: string };

const levels = [
  "مبتدئ — لا يحفظ",
  "يحفظ جزء عمّ",
  "يحفظ ١-٥ أجزاء",
  "يحفظ ٦-١٥ جزء",
  "يحفظ ١٦-٢٩ جزء",
  "متمّ للحفظ",
];

export function StudentRegisterForm({ packages }: { packages: Package[] }) {
  const [state, formAction] = useActionState<ActionState, FormData>(
    registerStudent,
    {},
  );
  const e = state.fieldErrors ?? {};

  return (
    <Card>
      <h1 className="font-display text-2xl font-bold">تسجيل طالب جديد</h1>
      <p className="mt-1 text-sm text-muted">
        ابدأ رحلتك في حفظ كتاب الله مع متابعة دقيقة.
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

        <div className="grid grid-cols-2 gap-3">
          <Field label="العمر" htmlFor="age" error={e.age}>
            <Input id="age" name="age" type="number" min={4} max={100} dir="ltr" />
          </Field>
          <Field label="الجنس" htmlFor="gender" error={e.gender} required>
            <Select id="gender" name="gender" defaultValue="">
              <option value="" disabled>اختر…</option>
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </Select>
          </Field>
        </div>

        <Field label="مستوى الحفظ الحالي" htmlFor="current_level" error={e.current_level} required>
          <Select id="current_level" name="current_level" defaultValue="">
            <option value="" disabled>اختر مستواك…</option>
            {levels.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </Select>
        </Field>

        <Field label="هل لديك خبرة سابقة في التجويد؟" htmlFor="has_tajweed_experience">
          <Select id="has_tajweed_experience" name="has_tajweed_experience" defaultValue="false">
            <option value="false">لا</option>
            <option value="true">نعم</option>
          </Select>
        </Field>

        {packages.length > 0 && (
          <Field label="الباقة المطلوبة" htmlFor="package_id" error={e.package_id} hint="يمكن تغييرها لاحقاً">
            <Select id="package_id" name="package_id" defaultValue="">
              <option value="">اختر لاحقاً</option>
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.price} {p.currency}
                </option>
              ))}
            </Select>
          </Field>
        )}

        <Field label="كلمة المرور" htmlFor="password" error={e.password} hint="٦ أحرف على الأقل" required>
          <Input id="password" name="password" type="password" autoComplete="new-password" />
        </Field>

        <SubmitButton className="w-full" size="lg" pendingText="جارٍ إنشاء الحساب…">
          إنشاء الحساب
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
