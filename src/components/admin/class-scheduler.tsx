"use client";

import { useActionState, useState } from "react";
import { scheduleClass, type ClassState } from "@/lib/admin/class-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Opt = { id: string; full_name: string };

export function ClassScheduler({
  students,
  teachers,
}: {
  students: Opt[];
  teachers: Opt[];
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ClassState, FormData>(scheduleClass, {});
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <div className="flex items-center justify-between">
        <div>
          {state.success && <p className="text-sm text-success">{state.success}</p>}
        </div>
        <Button size="sm" onClick={() => setOpen(true)} disabled={students.length === 0}>
          + جدولة حصة
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold">جدولة حصة جديدة</h3>
      <form action={formAction} className="space-y-4">
        {state.error && <FormMessage>{state.error}</FormMessage>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="الطالب" htmlFor="student_id" error={e.student_id} required>
            <Select id="student_id" name="student_id" defaultValue="">
              <option value="" disabled>اختر طالباً…</option>
              {students.map((s) => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </Select>
          </Field>
          <Field label="المعلم" htmlFor="teacher_id" error={e.teacher_id} required>
            <Select id="teacher_id" name="teacher_id" defaultValue="">
              <option value="" disabled>اختر معلماً…</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>{t.full_name}</option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="موعد الحصة" htmlFor="start_time" error={e.start_time} required>
            <Input id="start_time" name="start_time" type="datetime-local" dir="ltr" />
          </Field>
          <Field label="المدة (دقيقة)" htmlFor="duration_minutes" error={e.duration_minutes}>
            <Input id="duration_minutes" name="duration_minutes" type="number" min={15} max={180} step={5} dir="ltr" defaultValue={45} />
          </Field>
        </div>

        <Field label="رابط Google Meet" htmlFor="meet_link" error={e.meet_link} hint="اختياري — يُنشأ تلقائياً لاحقاً عبر Google Calendar">
          <Input id="meet_link" name="meet_link" dir="ltr" placeholder="https://meet.google.com/..." />
        </Field>

        <div className="flex gap-2">
          <SubmitButton size="sm" pendingText="جارٍ الجدولة…">جدولة الحصة</SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
        </div>
      </form>
    </Card>
  );
}
