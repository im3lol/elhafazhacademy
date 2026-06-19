import { getSetting } from "@/lib/settings";

export const EMAIL_SETTING_KEY = "email_config";

export type EmailConfig = {
  api_key: string; // مفتاح Resend
  from: string; // عنوان المُرسِل، مثل: "أكاديمية الحفظة <noreply@yourdomain.com>"
};

export async function getEmailConfig(): Promise<EmailConfig | null> {
  return getSetting<EmailConfig>(EMAIL_SETTING_KEY);
}

export async function isEmailEnabled(): Promise<boolean> {
  const c = await getEmailConfig();
  return !!c?.api_key && !!c.from;
}

/** إرسال بريد عبر Resend HTTP API — best-effort، لا يرمي استثناء. */
export async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const c = await getEmailConfig();
  if (!c?.api_key || !c.from || !to) return false;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.api_key}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ from: c.from, to, subject, html }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
