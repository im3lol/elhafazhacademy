import { describe, it, expect } from "vitest";
import { parsePage } from "@/components/ui/pagination";

describe("parsePage", () => {
  it("يُرجع الرقم الصحيح للصفحات الصالحة", () => {
    expect(parsePage("3")).toBe(3);
    expect(parsePage("1")).toBe(1);
  });

  it("يرجع ١ للقيم غير الصالحة", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("-2")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("2.5")).toBe(1);
  });
});
