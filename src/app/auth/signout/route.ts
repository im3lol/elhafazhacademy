import { NextResponse, type NextRequest } from "next/server";
import { destroySession } from "@/lib/auth/session";

/** تسجيل الخروج عبر POST ثم التحويل لصفحة الدخول. */
export async function POST(request: NextRequest) {
  await destroySession();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
