import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markAllRead, markRead } from "@/lib/notifications/actions";
import type { Inbox } from "@/lib/notifications/service";

/** وقت نسبي مختصر بالعربية. */
function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `قبل ${min.toLocaleString("ar-EG")} دقيقة`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `قبل ${hr.toLocaleString("ar-EG")} ساعة`;
  const days = Math.floor(hr / 24);
  if (days < 30) return `قبل ${days.toLocaleString("ar-EG")} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" });
}

export function NotificationsView({ items }: { items: Inbox[] }) {
  const hasUnread = items.some((i) => !i.read);
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black">الإشعارات</h1>
          <p className="mt-1 text-muted">آخر التنبيهات على حسابك.</p>
        </div>
        {hasUnread && (
          <form action={markAllRead}>
            <Button type="submit" size="sm" variant="outline">
              تحديد الكل كمقروء
            </Button>
          </form>
        )}
      </div>

      {items.length === 0 ? (
        <Card className="text-sm text-muted">لا توجد إشعارات بعد.</Card>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={n.read ? "" : "border-brand/30 bg-brand-subtle/40"}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-sm text-muted">{n.message}</p>}
                  <p className="mt-2 text-xs text-muted">{relTime(n.created_at)}</p>
                </div>
                {!n.read && (
                  <form action={markRead} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={n.id} />
                    <button
                      type="submit"
                      className="text-xs font-medium text-brand hover:underline"
                      title="تحديد كمقروء"
                    >
                      تحديد كمقروء
                    </button>
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="غير مقروء" />
                  </form>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
