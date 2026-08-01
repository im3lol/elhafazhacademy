import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSessionUser } from "@/lib/auth/session";
import { getAuthUrl, GOOGLE_STATE_COOKIE } from "@/lib/google/client";

/** يبدأ تدفق OAuth لربط حساب Google (أدمن فقط). */
export async function GET() {
  const user = await getSessionUser();
  if (!user || user.userType !== "admin") {
    return new NextResponse("Forbidden", { status: 403 });
  }
  try {
    const { url, state } = await getAuthUrl();
    // يُقارَن عند العودة — يمنع تمرير رمز حساب غريب إلى أدمن مسجَّل (CSRF)
    (await cookies()).set(GOOGLE_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 600,
    });
    return NextResponse.redirect(url);
  } catch {
    return NextResponse.redirect(
      new URL("/admin/settings?google=misconfigured", process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    );
  }
}
