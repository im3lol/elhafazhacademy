import { describe, it, expect } from "vitest";
import { sniffMime, EXT_FOR_MIME } from "@/lib/files/sniff";

const pad = (head: number[]) => {
  const a = new Uint8Array(16);
  head.forEach((v, i) => (a[i] = v));
  return a;
};

describe("sniffMime", () => {
  it("يتعرّف على JPEG/PNG/WEBP/PDF من البايتات الأولى", () => {
    expect(sniffMime(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffMime(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffMime(pad([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
    expect(sniffMime(pad([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe("application/pdf");
  });

  it("يرفض المحتوى المزوّر (نص يُدّعى أنه صورة)", () => {
    // "GIF89a..." أو نص عادي ليس ضمن الصيغ المسموحة
    const fakeText = new TextEncoder().encode("This is not an image at all!!");
    expect(sniffMime(fakeText)).toBeNull();
    expect(sniffMime(pad([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBeNull(); // GIF غير مدعوم
  });

  it("يرفض الملفات الأقصر من ١٢ بايت", () => {
    expect(sniffMime(new Uint8Array([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it("لكل نوع مكتشَف امتداد قانوني", () => {
    expect(EXT_FOR_MIME["image/jpeg"]).toBe("jpg");
    expect(EXT_FOR_MIME["application/pdf"]).toBe("pdf");
  });
});
