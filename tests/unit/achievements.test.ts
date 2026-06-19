import { describe, it, expect } from "vitest";
import { earnedAchievementKeys, type Ctx } from "@/lib/student/progress";

const ctx = (over: Partial<Ctx>): Ctx => ({ memorized: 0, totalLessons: 0, bestScore: null, ...over });

describe("earnedAchievementKeys", () => {
  it("لا إنجازات لطالب جديد بلا حصص ولا حفظ", () => {
    expect(earnedAchievementKeys(ctx({}))).toEqual([]);
  });

  it("أول حصة تُمنح عند حصة واحدة", () => {
    expect(earnedAchievementKeys(ctx({ totalLessons: 1 }))).toContain("first_lesson");
    expect(earnedAchievementKeys(ctx({ totalLessons: 1 }))).not.toContain("lessons_10");
  });

  it("١٠ حصص تمنح أول حصة و١٠ حصص معاً", () => {
    const keys = earnedAchievementKeys(ctx({ totalLessons: 10 }));
    expect(keys).toContain("first_lesson");
    expect(keys).toContain("lessons_10");
  });

  it("تقييم ممتاز يُمنح عند ٩٠ فأكثر فقط", () => {
    expect(earnedAchievementKeys(ctx({ bestScore: 89 }))).not.toContain("excellent");
    expect(earnedAchievementKeys(ctx({ bestScore: 90 }))).toContain("excellent");
  });

  it("عتبات الأجزاء تتراكم تصاعدياً", () => {
    expect(earnedAchievementKeys(ctx({ memorized: 1 }))).toEqual(["juz_1"]);
    const five = earnedAchievementKeys(ctx({ memorized: 5 }));
    expect(five).toEqual(expect.arrayContaining(["juz_1", "juz_5"]));
    expect(five).not.toContain("juz_15");
    const all = earnedAchievementKeys(ctx({ memorized: 30 }));
    expect(all).toEqual(expect.arrayContaining(["juz_1", "juz_5", "juz_15", "juz_20", "juz_30"]));
  });

  it("ختم القرآن يتطلّب ٣٠ جزءاً", () => {
    expect(earnedAchievementKeys(ctx({ memorized: 29 }))).not.toContain("juz_30");
    expect(earnedAchievementKeys(ctx({ memorized: 30 }))).toContain("juz_30");
  });
});
