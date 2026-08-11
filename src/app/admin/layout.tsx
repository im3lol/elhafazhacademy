import { requireActiveAdmin } from "@/lib/auth/guards";
import { getUnreadCount } from "@/lib/notifications/service";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { getBranding } from "@/lib/branding";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireActiveAdmin();
  const [unread, { branding }] = await Promise.all([getUnreadCount(user.id), getBranding()]);
  return (
    <DashboardShell
      role="admin"
      email={user.email}
      unreadCount={unread}
      brandName={branding.name}
      brandLogo={branding.logo || undefined}
    >
      {children}
    </DashboardShell>
  );
}
