import { requireRole } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getBranding } from "@/lib/branding";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("student");
  const [unread, { branding }] = await Promise.all([getUnreadCount(user.id), getBranding()]);
  return (
    <DashboardShell
      role="student"
      email={user.email}
      unreadCount={unread}
      brandName={branding.name}
      brandLogo={branding.logo || undefined}
    >
      {children}
    </DashboardShell>
  );
}
