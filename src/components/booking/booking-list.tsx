"use client";

import { useActionState } from "react";
import { bookSlot, type BookingState } from "@/lib/booking/actions";
import { Card } from "@/components/ui/card";
import { FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { formatClassTime } from "@/lib/class-status";

type Slot = { id: string; start_time: string; duration_minutes: number };

export function BookingList({ slots }: { slots: Slot[] }) {
  const [state, formAction] = useActionState<BookingState, FormData>(bookSlot, {});

  return (
    <div className="space-y-3">
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.success && <FormMessage type="success">{state.success}</FormMessage>}

      {slots.length === 0 ? (
        <Card className="text-sm text-muted">لا توجد أوقات متاحة من معلمك حالياً. تابع لاحقاً.</Card>
      ) : (
        slots.map((s) => (
          <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium" dir="rtl">{formatClassTime(s.start_time)}</p>
              <p className="text-sm text-muted">مدة الحصة: {s.duration_minutes.toLocaleString("ar-EG")} دقيقة</p>
            </div>
            <form action={formAction}>
              <input type="hidden" name="slot_id" value={s.id} />
              <SubmitButton size="sm" pendingText="جارٍ الحجز…">احجز هذا الوقت</SubmitButton>
            </form>
          </Card>
        ))
      )}
    </div>
  );
}
