"use client";

import { useActionState, useState } from "react";
import { createTeacher, createStudent, type PersonFormState } from "@/lib/admin/people-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export type Option = { id: string; label: string };

/**
 * نموذج إنشاء معلم أو طالب من لوحة الأدمن.
 * مطويّ افتراضياً كي لا يزاحم قائمة الموجودين.
 */
export function CreatePersonForm({
  kind,
  teachers = [],
  packages = [],
}: {
  kind: "teacher" | "student";
  teachers?: Option[];
  packages?: Option[];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<PersonFormState, FormData>(
    kind === "teacher" ? createTeacher : createStudent,
    {},
  );

  const title = kind === "teacher" ? "إضافة معلم" : "إضافة طالب";

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-muted">
            {kind === "teacher"
              ? "يُنشأ الحساب معتمَداً ويستطيع الدخول فوراً."
              : "يُنشأ الحساب مفعّلاً (استلمتَ الدفع خارج المنصة)."}
          </p>
        </div>
        <Button type="button" size="sm" variant={open ? "ghost" : "primary"} onClick={() => setOpen((v) => !v)}>
          {open ? "إخفاء" : title}
        </Button>
      </div>

      {open && (
        <form action={action} className="space-y-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input name="full_name" placeholder="الاسم الكامل" required maxLength={120} />
            <Input name="email" type="email" placeholder="البريد الإلكتروني" dir="ltr" required />
            <Input
              name="password"
              type="password"
              placeholder="كلمة مرور مبدئية (٨ أحرف فأكثر)"
              required
              minLength={8}
            />
            <Input name="phone" placeholder="رقم الهاتف" dir="ltr" />
            <Input name="whatsapp" placeholder="واتساب (اختياري)" dir="ltr" />
            <Input name="country" placeholder="الدولة" />

            {kind === "teacher" && (
              <Input name="per_class_rate" type="number" min={1} dir="ltr" placeholder="تكلفة الحصة (اختياري)" />
            )}

            {kind === "student" && (
              <>
                <Select name="teacher_id" defaultValue="">
                  <option value="">بلا معلم بعد</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.label}</option>
                  ))}
                </Select>
                <Select name="package_id" defaultValue="">
                  <option value="">بلا باقة</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </Select>
              </>
            )}
          </div>

          <p className="text-xs text-muted">
            سلّم كلمة المرور المبدئية لصاحب الحساب واطلب منه تغييرها من «الإعدادات» بعد أول دخول.
          </p>

          {state.error && (
            <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
          )}
          {state.success && (
            <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{state.success}</p>
          )}

          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "جارٍ الإنشاء…" : title}
          </Button>
        </form>
      )}
    </Card>
  );
}
