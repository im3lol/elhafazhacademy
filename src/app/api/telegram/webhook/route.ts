import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getTelegramConfig, sendTelegram } from "@/lib/telegram/client";

export const dynamic = "force-dynamic";

/** Webhook تيليجرام: يربط حساب المستخدم عند إرسال /start <code>. */
export async function POST(req: Request) {
  const cfg = await getTelegramConfig();
  if (!cfg?.bot_token) return NextResponse.json({ ok: true });

  // التحقق من السر (Telegram يرسله في الترويسة)
  if (cfg.webhook_secret) {
    const secret = req.headers.get("x-telegram-bot-api-secret-token");
    if (secret !== cfg.webhook_secret) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
  }

  const update = await req.json().catch(() => null);
  const msg = update?.message;
  const text: string = msg?.text ?? "";
  const chatId = msg?.chat?.id;

  if (chatId && text.startsWith("/start")) {
    const code = text.split(/\s+/)[1] ?? "";
    if (code) {
      const [u] = await sql<{ id: string }[]>`
        update users set telegram_chat_id = ${String(chatId)}, telegram_link_code = null
        where telegram_link_code = ${code}
        returning id`;
      await sendTelegram(
        String(chatId),
        u ? "✅ تم ربط حسابك بأكاديمية الحفظة. ستصلك الإشعارات هنا." : "رمز ربط غير صالح أو منتهٍ. أنشئ رمزاً جديداً من حسابك.",
      );
    } else {
      await sendTelegram(String(chatId), "أهلاً بك في أكاديمية الحفظة 👋 لربط حسابك، استخدم زر الربط من صفحة الإشعارات في حسابك.");
    }
  }

  return NextResponse.json({ ok: true });
}
