export const classStatusLabel: Record<string, string> = {
  scheduled: "مجدولة",
  meet_created: "الرابط جاهز",
  meet_sent: "تم إرسال الرابط",
  waiting: "بالانتظار",
  live: "جارية",
  completed: "مكتملة",
  no_show_student: "غياب الطالب",
  no_show_teacher: "غياب المعلم",
  cancelled: "ملغاة",
  rescheduled: "أُعيد جدولتها",
};

export const classStatusClass: Record<string, string> = {
  scheduled: "bg-info/15 text-info",
  meet_created: "bg-info/15 text-info",
  meet_sent: "bg-info/15 text-info",
  waiting: "bg-warning/15 text-warning",
  live: "bg-success/15 text-success",
  completed: "bg-success/15 text-success",
  no_show_student: "bg-danger/15 text-danger",
  no_show_teacher: "bg-danger/15 text-danger",
  cancelled: "bg-muted/15 text-muted",
  rescheduled: "bg-warning/15 text-warning",
};

/** تنسيق موعد بتوقيت القاهرة بالعربية. */
export function formatClassTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "medium",
    timeStyle: "short",
  });
}
