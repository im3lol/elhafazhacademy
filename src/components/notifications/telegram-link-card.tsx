import { sql } from "@/lib/db";
import { getTelegramConfig } from "@/lib/telegram/client";
import { createTelegramLink, unlinkTelegram } from "@/lib/telegram/actions";
import { Card } from "@/components/ui/card";
import { Button, buttonClasses } from "@/components/ui/button";

/** بطاقة ربط تيليجرام — تظهر فقط عند تفعيل التكامل من الأدمن. */
export async function TelegramLinkCard({ userId }: { userId: string }) {
  const cfg = await getTelegramConfig();
  if (!cfg?.bot_token || !cfg.bot_username) return null;

  const [u] = await sql<{ chat: string | null; code: string | null }[]>`
    select telegram_chat_id as chat, telegram_link_code as code from users where id = ${userId} limit 1`;
  const linked = !!u?.chat;
  const deepLink = u?.code ? `https://t.me/${cfg.bot_username}?start=${u.code}` : null;

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg font-bold">إشعارات تيليجرام</h2>
        <span
          className={`rounded-full px-3 py-1 text-xs font-medium ${
            linked ? "bg-success/15 text-success" : "bg-muted/15 text-muted"
          }`}
        >
          {linked ? "مربوط" : "غير مربوط"}
        </span>
      </div>

      {linked ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-muted">تصلك التنبيهات على تيليجرام إضافةً إلى التطبيق.</p>
          <form action={unlinkTelegram}>
            <Button type="submit" size="sm" variant="outline">إلغاء الربط</Button>
          </form>
        </div>
      ) : deepLink ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-sm">افتح البوت واضغط <span className="font-bold">Start</span> لإتمام الربط:</p>
          <a href={deepLink} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm" })}>
            فتح بوت تيليجرام
          </a>
          <p className="text-xs text-muted">بعد الضغط على Start سيُربط حسابك تلقائياً. حدّث الصفحة للتأكد.</p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
          <p className="text-sm text-muted">اربط تيليجرام لاستقبال التنبيهات فوراً.</p>
          <form action={createTelegramLink}>
            <Button type="submit" size="sm">إنشاء رابط الربط</Button>
          </form>
        </div>
      )}
    </Card>
  );
}
