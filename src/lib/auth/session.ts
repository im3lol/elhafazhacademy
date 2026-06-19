import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  signSession,
  verifySession,
  SESSION_COOKIE,
  SESSION_MAX_AGE,
  type SessionPayload,
} from "@/lib/auth/jwt";

export type UserType = "student" | "teacher" | "admin";

export type SessionUser = {
  id: string;
  email: string;
  userType: UserType;
};

/** يقرأ المستخدم الحالي من كوكي الجلسة (JWT) — لا اتصال بالشبكة. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySession(token);
  if (!payload) return null;
  return { id: payload.sub, email: payload.email, userType: payload.type };
}

/** ينشئ جلسة ويضبط الكوكي. */
export async function createSession(payload: SessionPayload) {
  const token = await signSession(payload);
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

/** يحذف الجلسة. */
export async function destroySession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** يفرض دوراً محدداً؛ يحوّل خلاف ذلك. */
export async function requireRole(type: UserType): Promise<SessionUser> {
  const u = await getSessionUser();
  if (!u) redirect("/login");
  if (u.userType !== type) redirect(homeForType(u.userType));
  return u;
}

export function homeForType(type?: string | null) {
  switch (type) {
    case "teacher":
      return "/teacher/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/student/dashboard";
  }
}
