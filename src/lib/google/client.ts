import { google } from "googleapis";
import { getSetting, setSetting } from "@/lib/settings";

export const GOOGLE_SETTING_KEY = "google_oauth";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

type GoogleTokens = {
  refresh_token?: string | null;
  access_token?: string | null;
  expiry_date?: number | null;
  email?: string | null;
};

/** عميل OAuth2 مهيّأ من متغيرات البيئة. */
export function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ??
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/google/callback`;
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET غير مضبوطة");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** رابط منح الإذن (للأدمن). */
export function getAuthUrl() {
  return oauthClient().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GOOGLE_SCOPES,
  });
}

/** هل تم ربط حساب Google (يوجد refresh token)؟ */
export async function isGoogleConnected(): Promise<{ connected: boolean; email?: string | null }> {
  const tokens = await getSetting<GoogleTokens>(GOOGLE_SETTING_KEY);
  return { connected: !!tokens?.refresh_token, email: tokens?.email ?? null };
}

/** عميل OAuth2 محمّل بالتوكن المخزّن، جاهز لطلبات API. */
export async function authedClient() {
  const tokens = await getSetting<GoogleTokens>(GOOGLE_SETTING_KEY);
  if (!tokens?.refresh_token) return null;
  const client = oauthClient();
  client.setCredentials({ refresh_token: tokens.refresh_token });
  // تحديث access token تلقائياً وحفظه
  client.on("tokens", async (t) => {
    await setSetting(GOOGLE_SETTING_KEY, {
      ...tokens,
      access_token: t.access_token ?? tokens.access_token,
      expiry_date: t.expiry_date ?? tokens.expiry_date,
      refresh_token: t.refresh_token ?? tokens.refresh_token,
    });
  });
  return client;
}
