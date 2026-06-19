import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { AccountSettings } from "@/components/account/account-settings";

export default async function StudentSettingsPage() {
  const user = await getSessionUser();
  const [p] = await sql<{ full_name: string; phone: string | null; whatsapp: string | null }[]>`
    select full_name, phone, whatsapp from students where user_id = ${user!.id} limit 1`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الإعدادات</h1>
        <p className="mt-1 text-muted">بياناتك الشخصية وكلمة المرور.</p>
      </div>
      <AccountSettings
        profile={{
          full_name: p?.full_name ?? "",
          phone: p?.phone ?? "",
          whatsapp: p?.whatsapp ?? "",
          email: user!.email,
        }}
      />
    </div>
  );
}
