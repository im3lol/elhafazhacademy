import { sql } from "@/lib/db";
import { requireActiveAdmin } from "@/lib/auth/guards";
import { AccountSettings } from "@/components/account/account-settings";

/**
 * حساب الأدمن الشخصي — صفحة منفصلة عن `/admin/settings` عمداً:
 * تلك تعرض client_secret وbot_token فتُحرَس بـ `settings.manage`، وبدون هذه
 * الصفحة يعجز أدمن لا يملك تلك الصلاحية (محاسب/دعم) عن تغيير كلمة مروره أصلاً.
 */
export const metadata = { title: "حسابي" };

export default async function AdminAccountPage() {
  const user = await requireActiveAdmin();
  const [p] = await sql<{ full_name: string; phone: string | null; whatsapp: string | null }[]>`
    select a.full_name, u.phone, u.whatsapp
    from admin_users a join users u on u.id = a.user_id
    where a.user_id = ${user.id} limit 1`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">حسابي</h1>
        <p className="mt-1 text-muted">بياناتك الشخصية وبريد الدخول وكلمة المرور.</p>
      </div>
      <AccountSettings
        profile={{
          full_name: p?.full_name ?? "",
          phone: p?.phone ?? "",
          whatsapp: p?.whatsapp ?? "",
          email: user.email,
        }}
      />
    </div>
  );
}
