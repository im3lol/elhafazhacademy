"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { hashPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

export type AdminFormState = { error?: string; success?: string };

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

/** تحديث صلاحيات دور (عدا super_admin الذي يبقى بكل الصلاحيات). */
export async function setRolePermissions(formData: FormData) {
  const admin = await requirePermission("roles.manage");
  const roleId = formData.get("role_id") as string;
  const keys = formData.getAll("perm").map(String);

  const [role] = await sql<{ name: string }[]>`select name from roles where id = ${roleId} limit 1`;
  if (!role || role.name === "super_admin") return; // super_admin غير قابل للتعديل (حماية من القفل الذاتي)

  await sql.begin(async (tx) => {
    await tx`delete from role_permissions where role_id = ${roleId}`;
    if (keys.length) {
      await tx`
        insert into role_permissions (role_id, permission_id)
        select ${roleId}, p.id from permissions p where p.key in ${sql(keys)}
        on conflict do nothing`;
    }
  });
  await logAudit(admin.id, "role.permissions_update", "role", roleId, { count: keys.length });
  revalidatePath("/admin/roles");
}

/** إنشاء مدير نظام جديد (حساب admin + سجل admin_users + دور اختياري). */
export async function createAdminUser(
  _prev: AdminFormState,
  formData: FormData,
): Promise<AdminFormState> {
  const admin = await requirePermission("roles.manage");

  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const roleId = (formData.get("role_id") as string) || null;

  if (fullName.length < 2) return { error: "الاسم مطلوب" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "بريد إلكتروني غير صالح" };
  if (password.length < 8) return { error: "كلمة المرور يجب ألا تقل عن ٨ أحرف" };

  const passwordHash = await hashPassword(password);

  let newUserId: string;
  try {
    newUserId = await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string }[]>`
        insert into users (email, password_hash, user_type, status)
        values (${email}, ${passwordHash}, 'admin', 'active')
        returning id`;
      await tx`
        insert into admin_users (user_id, full_name, role_id, status)
        values (${user.id}, ${fullName}, ${roleId}, 'Active')`;
      return user.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    return { error: "تعذّر إنشاء الحساب" };
  }

  await logAudit(admin.id, "admin.create", "user", newUserId, { email, role_id: roleId });
  revalidatePath("/admin/roles");
  return { success: `تم إنشاء حساب ${fullName}` };
}

/** إسناد دور لمستخدم أدمن. */
export async function setAdminRole(formData: FormData) {
  const admin = await requirePermission("roles.manage");
  const adminUserId = formData.get("admin_user_id") as string;
  const roleId = (formData.get("role_id") as string) || null;
  await sql`update admin_users set role_id = ${roleId} where id = ${adminUserId}`;
  await logAudit(admin.id, "admin.role_assign", "admin_user", adminUserId, { role_id: roleId });
  revalidatePath("/admin/roles");
}
