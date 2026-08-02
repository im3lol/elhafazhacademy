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

export type AdminSession = {
  user: SessionUser;
  /** هل يملك الأدمن هذه الصلاحية؟ — لإخفاء أزرار لا يستطيع تنفيذها. */
  can: (key: string) => boolean;
};

/**
 * جلسة أدمن نشِط + مجموعة صلاحياته في استعلام واحد.
 * الجلسة عديمة الحالة وتبقى صالحة ٧ أيام، فتعطيل الأدمن وحده لا يقطع وصوله؛
 * ولأن الصفحات كانت تعرض أزراراً يرفضها حارس الإجراء لاحقاً بـ throw،
 * تُمرَّر الصلاحيات للصفحة لتُخفي ما لا يملكه بدل أن ينهار عند الضغط.
 */
export async function requireAdmin(viewKey?: string): Promise<AdminSession> {
  const user = await requireRole("admin");
  const [row] = await sql<{ status: string; keys: string[] }[]>`
    select au.status,
           coalesce(array_agg(p.key) filter (where p.key is not null), '{}') as keys
    from admin_users au
    left join role_permissions rp on rp.role_id = au.role_id
    left join permissions p on p.id = rp.permission_id
    where au.user_id = ${user.id}
    group by au.status`;

  // ponytail: التحويل للدخول يكفي — الكوكي لا يُحذف هنا (لا يمكن تعديله أثناء العرض)
  if (!row || row.status !== "Active") redirect("/login");

  const keys = new Set(row.keys);
  const can = (key: string) => keys.has(key);
  if (viewKey && !can(viewKey)) redirect("/admin/dashboard");
  return { user, can };
}

/** توافق: الاستدعاءات التي تحتاج المستخدم وحده. */
export async function requireActiveAdmin(): Promise<SessionUser> {
  return (await requireAdmin()).user;
}

/**
 * معرّف المعلم الحالي (لـ server actions) — يرمي إن لم يكن معلماً أو بلا ملف.
 * يُقرأ من التوكن الموقّع، ولا يُستعلم إلا لجلسة قديمة صدرت قبل إضافة الحقل.
 */
export async function currentTeacherId(): Promise<string> {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  if (u.profileId) return u.profileId;
  const [t] = await sql<{ id: string }[]>`select id from teachers where user_id = ${u.id} limit 1`;
  if (!t) throw new Error("لا يوجد ملف معلم");
  return t.id;
}

/** معرّف الطالب الحالي — نظير currentTeacherId. */
export async function currentStudentId(): Promise<string> {
  const u = await getSessionUser();
  if (!u || u.userType !== "student") throw new Error("غير مصرّح");
  if (u.profileId) return u.profileId;
  const [s] = await sql<{ id: string }[]>`select id from students where user_id = ${u.id} limit 1`;
  if (!s) throw new Error("لا يوجد ملف طالب");
  return s.id;
}

/**
 * جلسة صفحة لدور معيّن: تعيد المستخدم ومعرّف ملفه، وتحوّل عند انتهاء الجلسة.
 * تُغني الصفحات عن `getSessionUser()` ثم `user!.id` (الذي يرمي TypeError
 * على جلسة منتهية قبل أن يعمل تحويل الـ layout).
 */
export async function requireProfile(type: "student" | "teacher"): Promise<{
  user: SessionUser;
  profileId: string;
}> {
  const user = await requireRole(type);
  if (user.profileId) return { user, profileId: user.profileId };
  const rows =
    type === "teacher"
      ? await sql<{ id: string }[]>`select id from teachers where user_id = ${user.id} limit 1`
      : await sql<{ id: string }[]>`select id from students where user_id = ${user.id} limit 1`;
  if (!rows[0]) redirect("/login");
  return { user, profileId: rows[0].id };
}

/** يفرض صلاحية لعرض صفحة (لا لتنفيذ إجراء) — يحوّل بدل أن يرمي. */
export async function requirePermissionPage(key: string): Promise<SessionUser> {
  return (await requireAdmin(key)).user;
}
