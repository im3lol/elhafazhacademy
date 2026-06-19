import { sql } from "@/lib/db";
import { PackageManager, type Pkg } from "@/components/admin/package-manager";

export default async function AdminPackagesPage() {
  const packages = await sql<Pkg[]>`
    select id, name, description, classes_per_month, hours_per_month,
           price, currency, duration_days, type, is_active
    from packages order by price`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">إدارة الباقات</h1>
        <p className="mt-1 text-muted">أنشئ وعدّل الباقات التي تظهر للطلاب.</p>
      </div>
      <PackageManager packages={packages} />
    </div>
  );
}
