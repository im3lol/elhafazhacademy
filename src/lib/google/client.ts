import { google } from "googleapis";
import { getSetting, setSetting } from "@/lib/settings";

export const GOOGLE_SETTING_KEY = "google_oauth"; // التوكن المخزّن بعد الربط
export const GOOGLE_CREDS_KEY = "google_oauth_creds"; // Client ID/Secret (يُدار من لوحة الأدمن)
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

type GoogleCreds = { client_id?: string | null; client_secret?: string | null; redirect_uri?: string | null };

/** بيانات اعتماد Google: من قاعدة البيانات (لوحة الأدمن) أولاً، ثم متغيرات البيئة. */
export async function getGoogleCreds(): Promise<{ clientId?: string; clientSecret?: string; redirectUri: string }> {
  const stored = await getSetting<GoogleCreds>(GOOGLE_CREDS_KEY);
  const clientId = (stored?.client_id || process.env.GOOGLE_CLIENT_ID || "").trim() || undefined;
  const clientSecret = (stored?.client_secret || process.env.GOOGLE_CLIENT_SECRET || "").trim() || undefined;
  const redirectUri =
    (stored?.redirect_uri || process.env.GOOGLE_REDIRECT_URI || "").trim() ||
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/google/callback`;
  return { clientId, clientSecret, redirectUri };
}

/** هل بيانات الاعتماد مضبوطة (في القاعدة أو البيئة)؟ */
export async function googleCredsConfigured(): Promise<boolean> {
  const { clientId, clientSecret } = await getGoogleCreds();
  return !!clientId && !!clientSecret;
}

/** عميل OAuth2 مهيّأ ببيانات الاعتماد (قاعدة أو بيئة). */
export async function oauthClient() {
  const { clientId, clientSecret, redirectUri } = await getGoogleCreds();
  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET غير مضبوطة");
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** رابط منح الإذن (للأدمن). */
export async function getAuthUrl() {
  const client = await oauthClient();
  return client.generateAuthUrl({
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
  const client = await oauthClient();
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
