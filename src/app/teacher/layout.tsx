import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("teacher");
  const unread = await getUnreadCount(user.id);
  return (
    <DashboardShell role="teacher" email={user.email} unreadCount={unread}>
      {children}
    </DashboardShell>
  );
}
