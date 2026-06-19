import { getSessionUser } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/notifications/service";

export const dynamic = "force-dynamic";

/** عدد الإشعارات غير المقروءة للمستخدم الحالي (لتحديث الشارة دورياً). */
export async function GET() {
  const u = await getSessionUser();
  if (!u) return Response.json({ unread: 0 }, { status: 401 });
  const unread = await getUnreadCount(u.id);
  return Response.json({ unread });
}
