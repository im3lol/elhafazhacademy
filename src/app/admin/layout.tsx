import { requireActiveAdmin } from "@/lib/auth/guards";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveAdmin();
  const unread = await getUnreadCount(user.id);
  return (
    <DashboardShell role="admin" email={user.email} unreadCount={unread}>
      {children}
    </DashboardShell>
  );
}
