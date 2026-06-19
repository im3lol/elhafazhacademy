import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { setRolePermissions, setAdminRole } from "@/lib/admin/roles-actions";
import { CreateAdminForm } from "@/components/admin/create-admin-form";

type Role = { id: string; name: string; description: string | null };
type Perm = { id: string; key: string; description: string | null };
type AdminUser = { id: string; full_name: string; role_id: string | null; email: string };

const roleLabel: Record<string, string> = {
  super_admin: "مدير عام",
  support_agent: "موظف دعم",
  accountant: "مسؤول حسابات",
  teacher_supervisor: "مشرف معلمين",
};

export default async function AdminRolesPage() {
  const u = await getSessionUser();
  if (!u || !(await hasPermission(u.id, "roles.manage"))) redirect("/admin/dashboard");

  const [roles, perms, rolePerms, admins] = await Promise.all([
    sql<Role[]>`select id, name, description from roles order by name`,
    sql<Perm[]>`select id, key, description from permissions order by key`,
    sql<{ role_id: string; key: string }[]>`
      select rp.role_id, p.key from role_permissions rp join permissions p on p.id = rp.permission_id`,
    sql<AdminUser[]>`
      select au.id, au.full_name, au.role_id, u.email
      from admin_users au join users u on u.id = au.user_id order by au.full_name`,
  ]);

  const grantedByRole = new Map<string, Set<string>>();
  for (const r of rolePerms) {
    if (!grantedByRole.has(r.role_id)) grantedByRole.set(r.role_id, new Set());
    grantedByRole.get(r.role_id)!.add(r.key);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الأدوار والصلاحيات</h1>
        <p className="mt-1 text-muted">تحكّم في صلاحيات كل دور وأسنِد الأدوار لمديري النظام.</p>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">إضافة مدير جديد</h2>
        <CreateAdminForm
          roles={roles.map((r) => ({ id: r.id, name: r.name, label: roleLabel[r.name] ?? r.name }))}
        />
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">مديرو النظام</h2>
        <div className="space-y-3">
          {admins.map((a) => (
            <Card key={a.id} className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-lg font-bold">{a.full_name}</p>
                <p className="text-sm text-muted" dir="ltr">{a.email}</p>
              </div>
              <form action={setAdminRole} className="flex items-center gap-2">
                <input type="hidden" name="admin_user_id" value={a.id} />
                <Select name="role_id" defaultValue={a.role_id ?? ""} className="h-9 w-48">
                  <option value="">بلا دور</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>{roleLabel[r.name] ?? r.name}</option>
                  ))}
                </Select>
                <Button type="submit" size="sm" variant="outline">حفظ</Button>
              </form>
            </Card>
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-xl font-bold">صلاحيات الأدوار</h2>
        <div className="space-y-4">
          {roles.map((role) => {
            const granted = grantedByRole.get(role.id) ?? new Set<string>();
            const isSuper = role.name === "super_admin";
            return (
              <Card key={role.id} className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-display text-lg font-bold">{roleLabel[role.name] ?? role.name}</p>
                    {role.description && <p className="text-sm text-muted">{role.description}</p>}
                  </div>
                  {isSuper && <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold">كل الصلاحيات</span>}
                </div>

                {isSuper ? (
                  <p className="border-t border-border pt-3 text-sm text-muted">
                    المدير العام يملك جميع الصلاحيات دائماً (غير قابل للتعديل لمنع القفل الذاتي).
                  </p>
                ) : (
                  <form action={setRolePermissions} className="space-y-3 border-t border-border pt-3">
                    <input type="hidden" name="role_id" value={role.id} />
                    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {perms.map((p) => (
                        <label key={p.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            name="perm"
                            value={p.key}
                            defaultChecked={granted.has(p.key)}
                            className="h-4 w-4 accent-[var(--brand)]"
                          />
                          <span>{p.description ?? p.key}</span>
                        </label>
                      ))}
                    </div>
                    <Button type="submit" size="sm">حفظ صلاحيات الدور</Button>
                  </form>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
