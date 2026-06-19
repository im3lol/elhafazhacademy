import { getSessionUser } from "@/lib/auth/session";
import { getInbox } from "@/lib/notifications/service";
import { NotificationsView } from "@/components/notifications/notifications-view";
import { TelegramLinkCard } from "@/components/notifications/telegram-link-card";

export default async function TeacherNotificationsPage() {
  const user = await getSessionUser();
  const { items } = await getInbox(user!.id, 50);
  return (
    <div className="space-y-6">
      <TelegramLinkCard userId={user!.id} />
      <NotificationsView items={items} />
    </div>
  );
}
