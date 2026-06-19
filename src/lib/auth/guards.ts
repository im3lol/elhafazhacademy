import { getSessionUser, type SessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

/** يفرض أن المستخدم أدمن ويملك الصلاحية المطلوبة، وإلا يرمي. */
export async function requirePermission(key: string): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  if (!(await hasPermission(u.id, key))) throw new Error("لا تملك صلاحية لتنفيذ هذا الإجراء");
  return u;
}
