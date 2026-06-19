import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddSlotForm } from "@/components/booking/add-slot-form";
import { RecurringSlotForm } from "@/components/booking/recurring-slot-form";
import { removeSlot, removeRecurringSlot } from "@/lib/booking/actions";
import { formatClassTime } from "@/lib/class-status";

type Slot = { id: string; start_time: string; duration_minutes: number; status: string };
type Recurring = { id: string; weekday: number; time_of_day: string; duration_minutes: number };

const statusLabel: Record<string, string> = { open: "متاح", booked: "محجوز", cancelled: "ملغى" };
const weekdayLabel = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

export default async function TeacherAvailabilityPage() {
  const user = await getSessionUser();
  const [teacher] = await sql<{ id: string }[]>`select id from teachers where user_id = ${user!.id} limit 1`;

  const [slots, recurring] = teacher
    ? await Promise.all([
        sql<Slot[]>`
          select id, start_time, duration_minutes, status from class_slots
          where teacher_id = ${teacher.id} and start_time > now() - interval '1 day'
          order by start_time asc`,
        sql<Recurring[]>`
          select id, weekday, time_of_day, duration_minutes from recurring_slots
          where teacher_id = ${teacher.id} and active order by weekday, time_of_day`,
      ])
    : [[], []];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">أوقات التوفّر</h1>
        <p className="mt-1 text-muted">أضف أوقاتاً متاحة ليحجزها طلابك مباشرةً.</p>
      </div>

      <Card>
        <h2 className="mb-1 font-display text-lg font-bold">قالب أسبوعي متكرر</h2>
        <p className="mb-4 text-sm text-muted">يولّد أوقاتاً تلقائياً للأسابيع الأربعة القادمة، وتُجدَّد دورياً.</p>
        <RecurringSlotForm />

        {recurring.length > 0 && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            {recurring.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 text-sm">
                <span>
                  كل {weekdayLabel[r.weekday]} الساعة {r.time_of_day} ·{" "}
                  <span className="text-muted">{r.duration_minutes.toLocaleString("ar-EG")} دقيقة</span>
                </span>
                <form action={removeRecurringSlot}>
                  <input type="hidden" name="recurring_id" value={r.id} />
                  <Button type="submit" variant="ghost" size="sm">إيقاف</Button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 font-display text-lg font-bold">إضافة وقت لمرة واحدة</h2>
        <AddSlotForm />
      </Card>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">أوقاتك القادمة</h2>
        {slots.length === 0 ? (
          <Card className="text-sm text-muted">لم تُضِف أوقاتاً بعد.</Card>
        ) : (
          <div className="space-y-3">
            {slots.map((s) => (
              <Card key={s.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium" dir="rtl">{formatClassTime(s.start_time)}</p>
                  <p className="text-sm text-muted">{s.duration_minutes.toLocaleString("ar-EG")} دقيقة</p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      s.status === "booked" ? "bg-success/15 text-success" : "bg-info/15 text-info"
                    }`}
                  >
                    {statusLabel[s.status] ?? s.status}
                  </span>
                  {s.status === "open" && (
                    <form action={removeSlot}>
                      <input type="hidden" name="slot_id" value={s.id} />
                      <Button type="submit" variant="ghost" size="sm">حذف</Button>
                    </form>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
