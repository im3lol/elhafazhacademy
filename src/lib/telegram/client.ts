import { getSetting } from "@/lib/settings";

export const TELEGRAM_SETTING_KEY = "telegram_config";

export type TelegramConfig = {
  bot_token: string;
  bot_username: string;
  webhook_secret: string;
};

/** يقرأ إعداد بوت تيليجرام (المُدار من لوحة الأدمن). */
export async function getTelegramConfig(): Promise<TelegramConfig | null> {
  return getSetting<TelegramConfig>(TELEGRAM_SETTING_KEY);
}

/**
 * إرسال رسالة عبر بوت تيليجرام — best-effort، لا يرمي استثناء.
 * بمهلة صريحة: اتصال معلّق بلا مهلة كان يوقف دورة الـ cron كلها
 * فلا تُنفَّذ بقية خطواتها (الغياب، توليد المواعيد، إنهاء الاشتراكات).
 */
export async function sendTelegram(chatId: string, text: string): Promise<boolean> {
  const c = await getTelegramConfig();
  if (!c?.bot_token || !chatId) return false;
  try {
    const res = await fetch(`https://api.telegram.org/bot${c.bot_token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text }),
      signal: AbortSignal.timeout(8000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
