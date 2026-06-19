import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

/** فحص صحّة للنشر/المراقبة: يتحقّق من الاتصال بقاعدة البيانات. */
export async function GET() {
  try {
    await sql`select 1`;
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "error", db: "down" }, { status: 503 });
  }
}
