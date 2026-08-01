import { describe, it, expect } from "vitest";
import { nextOccurrences, HORIZON_WEEKS } from "@/lib/booking/recurring";
import { academyDay, ACADEMY_TZ } from "@/lib/class-status";

describe("nextOccurrences", () => {
  it("كل المواعيد المُولّدة تطابق اليوم والوقت المطلوبين بتوقيت الأكاديمية وفي المستقبل", () => {
    const weekday = 2; // الثلاثاء
    const occ = nextOccurrences(weekday, "18:30");
    expect(occ.length).toBeGreaterThanOrEqual(HORIZON_WEEKS - 1);
    expect(occ.length).toBeLessThanOrEqual(HORIZON_WEEKS);
    const now = Date.now();
    for (const d of occ) {
      // التحقق بتوقيت القاهرة لا بتوقيت الخادم — وإلا مرّ الاختبار على جهاز وسقط في الحاوية
      expect(academyDay(d).weekday).toBe(weekday);
      expect(d.toLocaleString("sv-SE", { timeZone: ACADEMY_TZ }).slice(11, 16)).toBe("18:30");
      expect(d.getTime()).toBeGreaterThan(now);
    }
  });

  it("المواعيد مرتّبة تصاعدياً بفارق أسبوع", () => {
    const occ = nextOccurrences(5, "10:00");
    for (let i = 1; i < occ.length; i++) {
      const diffDays = (occ[i].getTime() - occ[i - 1].getTime()) / 86400000;
      expect(Math.round(diffDays)).toBe(7);
    }
  });

  it("يرفض الوقت غير الصالح", () => {
    expect(nextOccurrences(1, "bad")).toEqual([]);
  });
});
