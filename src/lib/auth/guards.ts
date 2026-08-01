import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser, requireRole, type SessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

/** يفرض أن المستخدم أدمن ويملك الصلاحية المطلوبة، وإلا يرمي. */
export async function requirePermission(key: string): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  if (!(await hasPermission(u.id, key))) throw new Error("لا تملك صلاحية لتنفيذ هذا الإجراء");
  return u;
}

/**
 * يفرض أدمن ما زال نشطاً (لصفحات لوحة الأدمن).
 * الجلسة عديمة الحالة وتبقى صالحة ٧ أيام، فتعطيل الأدمن وحده لا يقطع وصوله.
 */
export async function requireActiveAdmin(): Promise<SessionUser> {
  const u = await requireRole("admin");
  const [row] = await sql<{ ok: boolean }[]>`
    select exists(
      select 1 from admin_users where user_id = ${u.id} and status = 'Active'
    ) as ok`;
  // ponytail: التحويل للدخول يكفي — الكوكي لا يُحذف هنا (لا يمكن تعديله أثناء العرض)
  if (!row?.ok) redirect("/login");
  return u;
}

/** يفرض صلاحية لعرض صفحة (لا لتنفيذ إجراء) — يحوّل بدل أن يرمي. */
export async function requirePermissionPage(key: string): Promise<SessionUser> {
  const u = await requireActiveAdmin();
  if (!(await hasPermission(u.id, key))) redirect("/admin/dashboard");
  return u;
}
