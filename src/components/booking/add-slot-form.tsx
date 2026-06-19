"use client";

import { useActionState } from "react";
import { addSlot, type BookingState } from "@/lib/booking/actions";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function AddSlotForm() {
  const [state, formAction] = useActionState<BookingState, FormData>(addSlot, {});
  return (
    <form action={formAction} className="space-y-4">
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.success && <FormMessage type="success">{state.success}</FormMessage>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="الموعد المتاح" htmlFor="start_time" required>
          <Input id="start_time" name="start_time" type="datetime-local" dir="ltr" required />
        </Field>
        <Field label="المدة (دقيقة)" htmlFor="duration_minutes">
          <Input id="duration_minutes" name="duration_minutes" type="number" min={15} max={180} step={5} dir="ltr" defaultValue={45} />
        </Field>
      </div>
      <SubmitButton size="sm" pendingText="جارٍ الإضافة…">إضافة وقت متاح</SubmitButton>
    </form>
  );
}
