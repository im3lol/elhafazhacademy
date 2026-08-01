import { describe, it, expect } from "vitest";
import { isSafeRelative, readFile } from "@/lib/storage";

describe("isSafeRelative", () => {
  it("يرفض الخروج من المجلد عبر `..`", () => {
    // الحالة الحقيقية: طالب مصرَّح له بمجلده يطلب ملف طالب آخر
    expect(isSafeRelative("payment-proofs/me/../victim/proof.jpg")).toBe(false);
    expect(isSafeRelative("payment-proofs/me/..\\victim\\proof.jpg")).toBe(false);
    expect(isSafeRelative("../../etc/passwd")).toBe(false);
  });

  it("يرفض المسارات المطلقة والفارغة", () => {
    expect(isSafeRelative("/etc/passwd")).toBe(false);
    expect(isSafeRelative("")).toBe(false);
  });

  it("يقبل المسارات العادية", () => {
    expect(isSafeRelative("payment-proofs/abc-123/1700000000000.jpg")).toBe(true);
  });
});

describe("readFile", () => {
  it("لا يقرأ شيئاً عبر مسار متجاوز حتى لو كان الملف موجوداً", async () => {
    expect(await readFile("payment-proofs/x/../../package.json")).toBeNull();
  });
});
