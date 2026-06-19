import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT = path.join(process.cwd(), process.env.STORAGE_DIR ?? "storage");

/** يحفظ بايتات تحت bucket/userId بامتداد محدّد ويُرجع المسار النسبي المخزَّن. */
export async function saveBuffer(
  bucket: string,
  userId: string,
  buffer: Buffer,
  ext: string,
): Promise<string> {
  const safeExt = (ext || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const filename = `${Date.now()}.${safeExt}`;
  const dir = path.join(ROOT, bucket, userId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, filename), buffer);
  return `${bucket}/${userId}/${filename}`;
}

/** يحفظ ملفاً تحت bucket/userId ويُرجع المسار النسبي المخزَّن. */
export async function saveFile(
  bucket: string,
  userId: string,
  file: File,
): Promise<string> {
  const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
  const buffer = Buffer.from(await file.arrayBuffer());
  return saveBuffer(bucket, userId, buffer, ext);
}

/** يقرأ ملفاً مخزَّناً (مسار نسبي). يمنع الخروج من جذر التخزين. */
export async function readFile(relativePath: string): Promise<Buffer | null> {
  const full = path.join(ROOT, relativePath);
  if (!full.startsWith(ROOT)) return null; // حماية من path traversal
  try {
    return await fs.readFile(full);
  } catch {
    return null;
  }
}

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
