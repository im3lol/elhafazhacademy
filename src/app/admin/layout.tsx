import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("admin");
  const unread = await getUnreadCount(user.id);
  return (
    <DashboardShell role="admin" email={user.email} unreadCount={unread}>
      {children}
    </DashboardShell>
  );
}
