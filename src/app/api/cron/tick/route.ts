import { NextResponse } from "next/server";
import { runClassTick } from "@/lib/classes/tick";

export const dynamic = "force-dynamic";

/** يتحقق من المفتاح السرّي عبر ترويسة Authorization أو معامل secret. */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  if (header === `Bearer ${secret}`) return true;
  return new URL(req.url).searchParams.get("secret") === secret;
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
