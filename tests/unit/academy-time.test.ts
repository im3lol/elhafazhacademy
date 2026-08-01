import { describe, it, expect } from "vitest";
import { parseAcademyLocal, academyDay, formatClassTime, ACADEMY_TZ } from "@/lib/class-status";

/** الوقت على الساعة بتوقيت الأكاديمية: "2026-08-05 15:00:00" */
const wall = (d: Date) => d.toLocaleString("sv-SE", { timeZone: ACADEMY_TZ });

describe("parseAcademyLocal", () => {
  it("يفسّر نص datetime-local بتوقيت الأكاديمية لا بتوقيت الخادم", () => {
    // شتاءً القاهرة UTC+2، وصيفاً UTC+3 — والنتيجة يجب أن تعود لنفس ما كتبه المستخدم
    expect(parseAcademyLocal("2026-01-15T15:00").toISOString()).toBe("2026-01-15T13:00:00.000Z");
    expect(parseAcademyLocal("2026-08-05T15:00").toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("ما يُدخله المستخدم هو ما يُعرض له (ذهاب وعودة)", () => {
    for (const local of ["2026-01-15T09:30", "2026-06-01T21:45", "2026-10-30T15:00"]) {
      expect(wall(parseAcademyLocal(local))).toBe(`${local.replace("T", " ")}:00`);
    }
    // معلم أدخل ٣:٠٠ عصراً صيفاً → يراها الطالب ٣:٠٠ عصراً لا ٦:٠٠ مساءً
    expect(formatClassTime(parseAcademyLocal("2026-08-05T15:00").toISOString()))
      .toBe("٠٥‏/٠٨‏/٢٠٢٦، ٣:٠٠ م");
  });

  it("يقبل الثواني ويمرّر النصوص ذات الإزاحة الصريحة كما هي", () => {
    expect(parseAcademyLocal("2026-08-05T15:00:00").toISOString()).toBe("2026-08-05T12:00:00.000Z");
    expect(parseAcademyLocal("2026-08-05T12:00:00Z").toISOString()).toBe("2026-08-05T12:00:00.000Z");
  });

  it("الموعد غير الصالح يعطي تاريخاً غير صالح لا موعداً عشوائياً", () => {
    expect(isNaN(parseAcademyLocal("").getTime())).toBe(true);
    expect(isNaN(parseAcademyLocal("bad").getTime())).toBe(true);
  });
});

describe("academyDay", () => {
  it("يحسب اليوم ورقمه في الأسبوع بتوقيت الأكاديمية", () => {
    // 2026-08-05 هو الأربعاء (٣)؛ عند 23:30 UTC يكون في القاهرة قد صار الخميس (٤)
    expect(academyDay(new Date("2026-08-05T12:00:00Z"))).toEqual({ date: "2026-08-05", weekday: 3 });
    expect(academyDay(new Date("2026-08-05T23:30:00Z"))).toEqual({ date: "2026-08-06", weekday: 4 });
  });
});
