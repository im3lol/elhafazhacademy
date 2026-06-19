import { describe, it, expect } from "vitest";
import { computeRange, inRange, type RangeNums } from "@/lib/mushaf/range";
import { isValidMushafPage } from "@/lib/mushaf/data";

const empty: RangeNums = { surahNumber: null, ayahFrom: null, ayahTo: null };

describe("computeRange", () => {
  it("الضغطة الأولى تبدأ نطاقاً عند الآية وتنقل للخطوة 1", () => {
    const r = computeRange(empty, 2, 5, 0);
    expect(r).toEqual({ surahNumber: 2, ayahFrom: 5, ayahTo: 5, step: 1 });
  });

  it("الضغطة الثانية تضبط النهاية تصاعدياً وتعيد الخطوة 0", () => {
    const first = computeRange(empty, 2, 5, 0); // {from:5,to:5,step:1}
    const r = computeRange(first, 2, 9, first.step);
    expect(r).toEqual({ surahNumber: 2, ayahFrom: 5, ayahTo: 9, step: 0 });
  });

  it("ترتّب تصاعدياً حين تُضغط النهاية قبل البداية", () => {
    const first = computeRange(empty, 2, 9, 0);
    const r = computeRange(first, 2, 4, first.step);
    expect(r).toEqual({ surahNumber: 2, ayahFrom: 4, ayahTo: 9, step: 0 });
  });

  it("تغيير السورة أثناء الخطوة 1 يبدأ نطاقاً جديداً", () => {
    const first = computeRange(empty, 2, 5, 0); // step 1
    const r = computeRange(first, 3, 7, first.step);
    expect(r).toEqual({ surahNumber: 3, ayahFrom: 7, ayahTo: 7, step: 1 });
  });

  it("الضغط من جديد بعد اكتمال نطاق (step 0) يبدأ نطاقاً جديداً", () => {
    const completed: RangeNums = { surahNumber: 2, ayahFrom: 5, ayahTo: 9 };
    const r = computeRange(completed, 2, 12, 0);
    expect(r).toEqual({ surahNumber: 2, ayahFrom: 12, ayahTo: 12, step: 1 });
  });
});

describe("inRange", () => {
  const v: RangeNums = { surahNumber: 2, ayahFrom: 5, ayahTo: 9 };
  it("داخل النطاق (الطرفان مشمولان)", () => {
    expect(inRange(v, 2, 5)).toBe(true);
    expect(inRange(v, 2, 7)).toBe(true);
    expect(inRange(v, 2, 9)).toBe(true);
  });
  it("خارج النطاق أو سورة أخرى", () => {
    expect(inRange(v, 2, 4)).toBe(false);
    expect(inRange(v, 2, 10)).toBe(false);
    expect(inRange(v, 3, 7)).toBe(false);
  });
  it("نطاق غير مكتمل لا يطابق", () => {
    expect(inRange({ surahNumber: 2, ayahFrom: 5, ayahTo: null }, 2, 5)).toBe(false);
  });
});

describe("isValidMushafPage", () => {
  it("يقبل 1..604 الصحيحة", () => {
    expect(isValidMushafPage(1)).toBe(true);
    expect(isValidMushafPage(300)).toBe(true);
    expect(isValidMushafPage(604)).toBe(true);
  });
  it("يرفض خارج النطاق وغير الصحيح", () => {
    expect(isValidMushafPage(0)).toBe(false);
    expect(isValidMushafPage(605)).toBe(false);
    expect(isValidMushafPage(2.5)).toBe(false);
    expect(isValidMushafPage(NaN)).toBe(false);
    expect(isValidMushafPage("3")).toBe(false);
  });
});
