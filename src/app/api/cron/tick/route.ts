import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runClassTick } from "@/lib/classes/tick";

export const dynamic = "force-dynamic";

/**
 * يتحقق من المفتاح السرّي عبر ترويسة Authorization أو معامل secret.
 * المعامل يُقبل للتوافق مع مجدولات لا تدعم الترويسات، لكنه يُسرّب السر
 * في سجلات الوصول والوسطاء — الترويسة هي الطريقة الموصى بها.
 * المقارنة بزمن ثابت تمنع استنتاج السر من فروق التوقيت.
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header && safeEqual(header, `Bearer ${secret}`)) return true;
  const param = new URL(req.url).searchParams.get("secret");
  return !!param && safeEqual(param, secret);
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

async function handle(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runClassTick();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
