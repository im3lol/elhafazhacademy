"use client";

import { useActionState } from "react";
import { updateProfile, changePassword, changeEmail, type AccountState } from "@/lib/account/actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function AccountSettings({
  profile,
}: {
  profile: { full_name: string; phone: string; whatsapp: string; email: string };
}) {
  const [p, profileAction] = useActionState<AccountState, FormData>(updateProfile, {});
  const [pw, pwAction] = useActionState<AccountState, FormData>(changePassword, {});
  const [em, emailAction] = useActionState<AccountState, FormData>(changeEmail, {});

  return (
    <div className="space-y-6">
      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">الملف الشخصي</h2>
        <form action={profileAction} className="space-y-4">
          {p.error && <FormMessage>{p.error}</FormMessage>}
          {p.success && <FormMessage type="success">{p.success}</FormMessage>}

          <Field label="الاسم الكامل" htmlFor="full_name" error={p.fieldErrors?.full_name} required>
            <Input id="full_name" name="full_name" defaultValue={profile.full_name} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="رقم الهاتف" htmlFor="phone">
              <Input id="phone" name="phone" dir="ltr" defaultValue={profile.phone} placeholder="+20..." />
            </Field>
            <Field label="واتساب" htmlFor="whatsapp">
              <Input id="whatsapp" name="whatsapp" dir="ltr" defaultValue={profile.whatsapp} placeholder="+20..." />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText="جارٍ الحفظ…">حفظ البيانات</SubmitButton>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">البريد الإلكتروني</h2>
        <p className="text-sm text-muted">
          بريدك الحالي: <span dir="ltr" className="font-medium text-foreground">{profile.email}</span>
          {" "}— وهو الذي تسجّل به الدخول.
        </p>
        <form action={emailAction} className="space-y-4">
          {em.error && <FormMessage>{em.error}</FormMessage>}
          {em.success && <FormMessage type="success">{em.success}</FormMessage>}

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="البريد الجديد" htmlFor="new_email" error={em.fieldErrors?.new_email} required>
              <Input id="new_email" name="new_email" type="email" dir="ltr" placeholder="you@example.com" autoComplete="email" />
            </Field>
            <Field
              label="كلمة المرور الحالية"
              htmlFor="email_current_password"
              error={em.fieldErrors?.current_password}
              hint="للتأكّد أنك صاحب الحساب"
              required
            >
              <Input id="email_current_password" name="current_password" type="password" autoComplete="current-password" />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText="جارٍ التغيير…">تغيير البريد</SubmitButton>
        </form>
      </Card>

      <Card className="space-y-4">
        <h2 className="font-display text-lg font-bold">تغيير كلمة المرور</h2>
        <form action={pwAction} className="space-y-4">
          {pw.error && <FormMessage>{pw.error}</FormMessage>}
          {pw.success && <FormMessage type="success">{pw.success}</FormMessage>}

          <Field label="كلمة المرور الحالية" htmlFor="current_password" error={pw.fieldErrors?.current_password} required>
            <Input id="current_password" name="current_password" type="password" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="كلمة المرور الجديدة" htmlFor="new_password" error={pw.fieldErrors?.new_password} hint="٨ أحرف على الأقل" required>
              <Input id="new_password" name="new_password" type="password" />
            </Field>
            <Field label="تأكيد كلمة المرور" htmlFor="confirm_password" error={pw.fieldErrors?.confirm_password} required>
              <Input id="confirm_password" name="confirm_password" type="password" />
            </Field>
          </div>
          <SubmitButton size="sm" pendingText="جارٍ التغيير…">تغيير كلمة المرور</SubmitButton>
        </form>
      </Card>
    </div>
  );
}
