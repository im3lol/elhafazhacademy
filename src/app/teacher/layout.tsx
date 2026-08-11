import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getBranding } from "@/lib/branding";

export default async function TeacherLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("teacher");
  const [unread, { branding }] = await Promise.all([getUnreadCount(user.id), getBranding()]);
  return (
    <DashboardShell
      role="teacher"
      email={user.email}
      unreadCount={unread}
      brandName={branding.name}
      brandLogo={branding.logo || undefined}
    >
      {children}
    </DashboardShell>
  );
}
