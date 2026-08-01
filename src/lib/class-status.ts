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

/** توقيت الأكاديمية — كل المواعيد تُدخَل وتُعرض به مهما كان توقيت الخادم. */
export const ACADEMY_TZ = "Africa/Cairo";

/** تنسيق موعد بتوقيت الأكاديمية بالعربية. */
export function formatClassTime(iso: string) {
  return new Date(iso).toLocaleString("ar-EG", {
    timeZone: ACADEMY_TZ,
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** إزاحة توقيت الأكاديمية بالمللي ثانية عند لحظة معيّنة (تراعي التوقيت الصيفي). */
function academyOffsetMs(at: Date) {
  const wall = at.toLocaleString("sv-SE", { timeZone: ACADEMY_TZ }); // "2026-08-05 18:00:00"
  return new Date(`${wall.replace(" ", "T")}Z`).getTime() - at.getTime();
}

/**
 * يحوّل نص datetime-local ("2026-08-05T15:00" بلا إزاحة) إلى اللحظة الصحيحة
 * باعتباره توقيت الأكاديمية. بدون هذا يُفسَّر النص بتوقيت الخادم (UTC في الحاوية)
 * فيُخزَّن الموعد مزاحاً ٢–٣ ساعات عمّا أدخله المستخدم.
 * نصٌّ بإزاحة صريحة أو بصيغة أخرى يُمرَّر إلى Date كما هو.
 */
export function parseAcademyLocal(local: string): Date {
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(:\d{2})?$/.exec(local?.trim() ?? "");
  if (!m) return new Date(local);
  const asUtc = new Date(`${m[1]}T${m[2]}${m[3] ?? ":00"}Z`);
  // الطرح مرتين: الحساب الثاني يصحّح المواعيد الواقعة حول تغيير التوقيت الصيفي
  const once = new Date(asUtc.getTime() - academyOffsetMs(asUtc));
  return new Date(asUtc.getTime() - academyOffsetMs(once));
}

/** تاريخ اليوم (YYYY-MM-DD) ورقمه في الأسبوع بتوقيت الأكاديمية. */
export function academyDay(at: Date) {
  const date = at.toLocaleDateString("sv-SE", { timeZone: ACADEMY_TZ });
  return { date, weekday: new Date(`${date}T12:00:00Z`).getUTCDay() };
}
