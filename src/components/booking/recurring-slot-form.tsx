"use client";

import { useActionState } from "react";
import { addRecurringSlot, type BookingState } from "@/lib/booking/actions";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

const WEEKDAYS = [
  { v: 6, label: "السبت" },
  { v: 0, label: "الأحد" },
  { v: 1, label: "الإثنين" },
  { v: 2, label: "الثلاثاء" },
  { v: 3, label: "الأربعاء" },
  { v: 4, label: "الخميس" },
  { v: 5, label: "الجمعة" },
];

export function RecurringSlotForm() {
  const [state, action, pending] = useActionState<BookingState, FormData>(addRecurringSlot, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted">اليوم</span>
          <Select name="weekday" defaultValue="6">
            {WEEKDAYS.map((d) => (
              <option key={d.v} value={d.v}>{d.label}</option>
            ))}
          </Select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">الوقت</span>
          <Input name="time_of_day" type="time" defaultValue="18:00" required />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-muted">المدة</span>
          <Select name="duration_minutes" defaultValue="45">
            <option value="30">٣٠ دقيقة</option>
            <option value="45">٤٥ دقيقة</option>
            <option value="60">٦٠ دقيقة</option>
          </Select>
        </label>
      </div>

      {state.error && (
        <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400">{state.error}</p>
      )}
      {state.success && <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{state.success}</p>}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "جارٍ الإضافة…" : "إضافة قالب أسبوعي"}
      </Button>
    </form>
  );
}
