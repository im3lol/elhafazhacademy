import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReciterAddForm } from "@/components/admin/reciter-add-form";
import { toggleReciterActive, deleteReciter } from "@/lib/admin/reciters-actions";

type Reciter = { id: string; name_ar: string; name_en: string | null; source: string; is_active: boolean };

export default async function AdminRecitersPage() {
  const u = await getSessionUser();
  if (!u || !(await hasPermission(u.id, "settings.manage"))) redirect("/admin/dashboard");

  const reciters = await sql<Reciter[]>`
    select id, name_ar, name_en, source, is_active from reciters order by created_at`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">القرّاء</h1>
        <p className="mt-1 text-muted">قرّاء التلاوة المتاحون في المصحف الشخصي (المصدر من everyayah.com).</p>
      </div>

      <Card className="space-y-3">
        <h2 className="font-display text-lg font-bold">إضافة قارئ</h2>
        <ReciterAddForm />
      </Card>

      <div className="space-y-3">
        {reciters.length === 0 ? (
          <Card className="text-sm text-muted">لا قرّاء بعد — أضِف أوّل قارئ.</Card>
        ) : (
          reciters.map((r) => (
            <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{r.name_ar}</p>
                <p className="text-sm text-muted" dir="ltr">{r.source}</p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    r.is_active ? "bg-success/15 text-success" : "bg-surface text-muted"
                  }`}
                >
                  {r.is_active ? "مفعّل" : "معطّل"}
                </span>
                <form action={toggleReciterActive}>
                  <input type="hidden" name="reciter_id" value={r.id} />
                  <Button type="submit" size="sm" variant="outline">{r.is_active ? "تعطيل" : "تفعيل"}</Button>
                </form>
                <form action={deleteReciter}>
                  <input type="hidden" name="reciter_id" value={r.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-danger">حذف</Button>
                </form>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
