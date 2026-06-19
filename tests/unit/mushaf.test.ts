import { describe, it, expect } from "vitest";
import { ayahAudioUrl, isMistakeType, juzName, wordStarts, MISTAKE_TYPE_KEYS, MISTAKE_TYPES } from "@/lib/mushaf/data";

describe("ayahAudioUrl", () => {
  it("يبني رابط everyayah بترقيم ثلاثي للسورة والآية", () => {
    expect(ayahAudioUrl("Husary_Muallim_128kbps", 2, 255)).toBe(
      "https://everyayah.com/data/Husary_Muallim_128kbps/002255.mp3",
    );
    expect(ayahAudioUrl("Alafasy_128kbps", 114, 6)).toBe(
      "https://everyayah.com/data/Alafasy_128kbps/114006.mp3",
    );
  });
});

describe("أنواع الأخطاء", () => {
  it("isMistakeType يقبل الأنواع المعروفة فقط", () => {
    expect(isMistakeType("tajweed")).toBe(true);
    expect(isMistakeType("excellent")).toBe(true);
    expect(isMistakeType("hacked")).toBe(false);
  });

  it("الأنواع الخمسة لها تسمية ولون نقطة", () => {
    expect(MISTAKE_TYPE_KEYS).toHaveLength(5);
    for (const k of MISTAKE_TYPE_KEYS) {
      expect(MISTAKE_TYPES[k].label.length).toBeGreaterThan(0);
      expect(MISTAKE_TYPES[k].dot).toMatch(/^bg-/);
    }
  });
});

describe("juzName", () => {
  it("يُرجع اسم الجزء العربي ضمن النطاق", () => {
    expect(juzName(1)).toBe("الجزء الأول");
    expect(juzName(30)).toBe("الجزء الثلاثون");
  });
  it("يُرجع نصاً فارغاً خارج النطاق", () => {
    expect(juzName(0)).toBe("");
    expect(juzName(31)).toBe("");
    expect(juzName(null)).toBe("");
  });
});

describe("wordStarts", () => {
  it("يبدأ من صفر وتتصاعد المواضع", () => {
    const s = wordStarts(["اللَّهُ", "لَا", "إِلَٰهَ", "إِلَّا"]);
    expect(s).toHaveLength(4);
    expect(s[0]).toBe(0);
    for (let i = 1; i < s.length; i++) expect(s[i]).toBeGreaterThan(s[i - 1]);
    expect(s[s.length - 1]).toBeLessThan(1);
  });
  it("الكلمات الأطول تأخذ حصة أكبر من الزمن", () => {
    const s = wordStarts(["كلمة_طويلة_جدا", "ا", "ا"]);
    expect(s[1]).toBeGreaterThan(0.33);
  });
});
