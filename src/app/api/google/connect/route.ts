import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { getAuthUrl } from "@/lib/google/client";

/** يبدأ تدفق OAuth لربط حساب Google (أدمن فقط). */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.userType !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    return NextResponse.redirect(await getAuthUrl());
  } catch {
    return NextResponse.redirect(
      new URL("/admin/settings?google=misconfigured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }
}
