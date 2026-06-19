import { describe, it, expect } from "vitest";
import { nextOccurrences, HORIZON_WEEKS } from "@/lib/booking/recurring";

describe("nextOccurrences", () => {
  it("كل المواعيد المُولّدة تطابق اليوم والوقت المطلوبين وفي المستقبل", () => {
    const weekday = 2; // الثلاثاء
    const occ = nextOccurrences(weekday, "18:30");
    expect(occ.length).toBeGreaterThanOrEqual(HORIZON_WEEKS - 1);
    expect(occ.length).toBeLessThanOrEqual(HORIZON_WEEKS);
    const now = Date.now();
    for (const d of occ) {
      expect(d.getDay()).toBe(weekday);
      expect(d.getHours()).toBe(18);
      expect(d.getMinutes()).toBe(30);
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
