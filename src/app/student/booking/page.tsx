import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { BookingList } from "@/components/booking/booking-list";

type Slot = { id: string; start_time: string; duration_minutes: number };

export default async function StudentBookingPage() {
  const user = await getSessionUser();
  const [student] = await sql<{ id: string; teacher_id: string | null; status: string; teacher_name: string | null }[]>`
    select s.id, s.teacher_id, s.status, t.full_name as teacher_name
    from students s left join teachers t on t.id = s.teacher_id
    where s.user_id = ${user!.id} limit 1`;

  const slots =
    student?.teacher_id && student.status === "Active"
      ? await sql<Slot[]>`
          select id, start_time, duration_minutes from class_slots
          where teacher_id = ${student.teacher_id} and status = 'open' and start_time > now()
          order by start_time asc`
      : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">حجز حصة</h1>
        <p className="mt-1 text-muted">
          {student?.teacher_name ? `اختر وقتاً متاحاً مع المعلم ${student.teacher_name}.` : "اختر وقتاً متاحاً لحجز حصتك."}
        </p>
      </div>

      {student?.status !== "Active" ? (
        <Card className="border-warning/30 bg-warning/10 text-sm">فعّل حسابك أولاً لتتمكّن من الحجز.</Card>
      ) : !student?.teacher_id ? (
        <Card className="text-sm text-muted">لم يُعيَّن لك معلم بعد. سيتواصل معك الدعم قريباً.</Card>
      ) : (
        <BookingList slots={slots} />
      )}
    </div>
  );
}
