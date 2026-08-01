import { promises as fs } from "node:fs";
import path from "node:path";

// في الإنتاج (Vercel) نستخدم Vercel Blob — نظام الملفات هناك للقراءة فقط ومؤقّت.
// في التطوير نستخدم القرص المحلي. الفاصل: وجود BLOB_READ_WRITE_TOKEN.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;
const ROOT = path.join(process.cwd(), process.env.STORAGE_DIR ?? "storage");

const MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  pdf: "application/pdf",
};

export function mimeFor(relativePath: string) {
  const ext = relativePath.split(".").pop()?.toLowerCase() ?? "";
  return MIME[ext] ?? "application/octet-stream";
}

/**
 * مسار نسبي آمن: بلا مقاطع `..` وغير مطلق.
 * بدونه يستطيع مستخدم مصرَّح له بمجلده الخروج منه إلى مجلد غيره
 * (فحص الملكية يقع على أول مقطع فقط، بينما join يفكّ `..` لاحقاً).
 */
export function isSafeRelative(relativePath: string) {
  if (!relativePath || path.isAbsolute(relativePath)) return false;
  return !relativePath.split(/[\\/]/).includes("..");
}

/** يحفظ بايتات تحت bucket/userId بامتداد محدّد ويُرجع المسار النسبي المخزَّن. */
export async function saveBuffer(
  bucket: string,
  userId: string,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const safeExt = (ext || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const key = `${bucket}/${userId}/${Date.now()}.${safeExt}`;

  if (useBlob) {
    const { put } = await import("@vercel/blob");
    // private: إثباتات الدفع مستندات مالية — تُقرأ فقط عبر الراوت الذي يفحص الصلاحية.
    // المسار ثابت (بلا لاحقة عشوائية) كي نتمكّن من قراءته لاحقاً بالمفتاح نفسه.
    await put(key, buffer, { access: "private", addRandomSuffix: false, contentType: mimeFor(key) });
    return key;
  }

  await fs.mkdir(path.join(ROOT, bucket, userId), { recursive: true });
  await fs.writeFile(path.join(ROOT, key), buffer);
  return key;
}

/** يقرأ ملفاً مخزَّناً (مسار نسبي). يمنع الخروج من المجلد المقصود. */
export async function readFile(relativePath: string): Promise<Buffer | null> {
  if (!isSafeRelative(relativePath)) return null;

  if (useBlob) {
    try {
      const { get } = await import("@vercel/blob");
      const res = await get(relativePath, { access: "private" });
      if (!res || res.statusCode !== 200) return null;
      return Buffer.from(await new Response(res.stream).arrayBuffer());
    } catch {
      return null;
    }
  }

  const full = path.join(ROOT, relativePath);
  // المقارنة بفاصل المسار: بدونه يمرّ مجلد شقيق مثل storage-backup
  if (full !== ROOT && !full.startsWith(ROOT + path.sep)) return null;
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}
