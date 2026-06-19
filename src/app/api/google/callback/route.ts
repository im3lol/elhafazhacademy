import { NextResponse, type NextRequest } from "next/server";
import { google } from "googleapis";
import { getSessionUser } from "@/lib/auth/session";
import { oauthClient, GOOGLE_SETTING_KEY } from "@/lib/google/client";
import { setSetting } from "@/lib/settings";

/** يستقبل رمز OAuth، يبادله بالتوكنات، ويخزّن refresh token. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  if (!user || user.userType !== "admin") {
    return NextResponse.redirect(new URL("/login", appUrl));
  }

  const code = new URL(request.url).searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/admin/settings?google=error", appUrl));
  }

  try {
    const client = oauthClient();
    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    // جلب بريد الحساب المربوط
    let email: string | null = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const info = await oauth2.userinfo.get();
      email = info.data.email ?? null;
    } catch {
      // غير حرج
    }

    if (!tokens.refresh_token) {
      // لم يصل refresh token (غالباً الحساب مربوط مسبقاً) — اطلب موافقة جديدة
      return NextResponse.redirect(new URL("/admin/settings?google=no_refresh", appUrl));
    }

    await setSetting(GOOGLE_SETTING_KEY, {
      refresh_token: tokens.refresh_token,
      access_token: tokens.access_token ?? null,
      expiry_date: tokens.expiry_date ?? null,
      email,
    });

    return NextResponse.redirect(new URL("/admin/settings?google=connected", appUrl));
  } catch {
    return NextResponse.redirect(new URL("/admin/settings?google=error", appUrl));
  }
}
