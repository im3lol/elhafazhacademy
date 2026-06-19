import { sql } from "@/lib/db";
import { sendTelegram } from "@/lib/telegram/client";

export type Inbox = {
  id: string;
  title: string | null;
  message: string | null;
  created_at: string;
  read: boolean;
};

/** ينشئ إشعاراً داخل التطبيق لمستخدم. */
export async function notify(
  userId: string,
  title: string,
  message: string,
  templateKey: string | null = null,
): Promise<void> {
  await sql`
    insert into notifications (user_id, channel, template_key, title, message, status, sent_at)
    values (${userId}, 'app', ${templateKey}, ${title}, ${message}, 'sent', now())`;

  // قناة تيليجرام (best-effort) إن كان المستخدم مربوطاً والتكامل مفعّلاً
  const [u] = await sql<{ chat: string | null }[]>`
    select telegram_chat_id as chat from users where id = ${userId} limit 1`;
  if (u?.chat) {
    await sendTelegram(u.chat, `${title}\n\n${message}`);
  }
}

/** إشعار لطالب عبر معرّف الطالب (يحل user_id تلقائياً). */
export async function notifyStudent(studentId: string, title: string, message: string): Promise<void> {
  const [r] = await sql<{ user_id: string }[]>`select user_id from students where id = ${studentId} limit 1`;
  if (r) await notify(r.user_id, title, message);
}

/** إشعار لمعلم عبر معرّف المعلم (يحل user_id تلقائياً). */
export async function notifyTeacher(teacherId: string, title: string, message: string): Promise<void> {
  const [r] = await sql<{ user_id: string }[]>`select user_id from teachers where id = ${teacherId} limit 1`;
  if (r) await notify(r.user_id, title, message);
}

/** صندوق الإشعارات + عدد غير المقروء. */
export async function getInbox(userId: string, limit = 30): Promise<{ items: Inbox[]; unread: number }> {
  const [items, unread] = await Promise.all([
    sql<Inbox[]>`
      select id, title, message, created_at, (status = 'read') as read
      from notifications
      where user_id = ${userId} and channel = 'app'
      order by created_at desc
      limit ${limit}`,
    getUnreadCount(userId),
  ]);
  return { items, unread };
}

/** عدد الإشعارات غير المقروءة. */
export async function getUnreadCount(userId: string): Promise<number> {
  const [c] = await sql<{ n: number }[]>`
    select count(*)::int as n from notifications
    where user_id = ${userId} and channel = 'app' and status <> 'read'`;
  return Number(c?.n ?? 0);
}
