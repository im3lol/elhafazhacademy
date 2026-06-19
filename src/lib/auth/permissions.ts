import { sql } from "@/lib/db";

/** هل يملك المستخدم الصلاحية المحدّدة (عبر دوره في admin_users)؟ */
export async function hasPermission(userId: string, key: string): Promise<boolean> {
  const [row] = await sql<{ ok: boolean }[]>`
    select exists(
      select 1
      from admin_users au
      join role_permissions rp on rp.role_id = au.role_id
      join permissions p on p.id = rp.permission_id
      where au.user_id = ${userId} and au.status = 'Active' and p.key = ${key}
    ) as ok`;
  return !!row?.ok;
}

/** يعيد كل مفاتيح صلاحيات المستخدم (للعرض/التحقق المتعدّد). */
export async function getPermissions(userId: string): Promise<string[]> {
  const rows = await sql<{ key: string }[]>`
    select p.key
    from admin_users au
    join role_permissions rp on rp.role_id = au.role_id
    join permissions p on p.id = rp.permission_id
    where au.user_id = ${userId} and au.status = 'Active'`;
  return rows.map((r) => r.key);
}
