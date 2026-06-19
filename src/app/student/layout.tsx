import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");
  const unread = await getUnreadCount(user.id);
  return (
    <DashboardShell role="student" email={user.email} unreadCount={unread}>
      {children}
    </DashboardShell>
  );
}
