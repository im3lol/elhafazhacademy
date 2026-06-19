"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession, homeForType } from "@/lib/auth/session";
import { checkThrottle, recordFailure, clearThrottle } from "@/lib/auth/throttle";
import {
  loginSchema,
  studentRegisterSchema,
  teacherRegisterSchema,
  forgotPasswordSchema,
} from "@/lib/validators/auth";

export type ActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

function flattenErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const i of issues) {
    const key = i.path[0] != null ? String(i.path[0]) : "";
    if (key && !fieldErrors[key]) fieldErrors[key] = i.message;
  }
  return fieldErrors;
}

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

/** تسجيل طالب جديد. */
export async function registerStudent(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = studentRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error.issues), error: "تحقق من الحقول المحددة" };
  }
  const d = parsed.data;
  const passwordHash = await hashPassword(d.password);

  let session;
  try {
    session = await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string; email: string }[]>`
        insert into users (email, password_hash, phone, whatsapp, user_type, status)
        values (${d.email}, ${passwordHash}, ${d.phone}, ${d.whatsapp || null}, 'student', 'active')
        returning id, email`;
      await tx`
        insert into students (user_id, full_name, phone, whatsapp, country, city, age, gender,
                              current_level, has_tajweed_experience, package_id, status)
        values (${user.id}, ${d.full_name}, ${d.phone}, ${d.whatsapp || null}, ${d.country},
                ${d.city || null}, ${d.age ?? null}, ${d.gender}, ${d.current_level},
                ${!!d.has_tajweed_experience}, ${d.package_id || null}, 'Pending Payment')`;
      return user;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    return { error: "تعذّر إنشاء الحساب" };
  }

  await createSession({ sub: session.id, type: "student", email: session.email });
  redirect("/student/payment");
}

/** تسجيل معلم جديد. */
export async function registerTeacher(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = teacherRegisterSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error.issues), error: "تحقق من الحقول المحددة" };
  }
  const d = parsed.data;
  const passwordHash = await hashPassword(d.password);

  let session;
  try {
    session = await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string; email: string }[]>`
        insert into users (email, password_hash, phone, whatsapp, user_type, status)
        values (${d.email}, ${passwordHash}, ${d.phone}, ${d.whatsapp || null}, 'teacher', 'active')
        returning id, email`;
      await tx`
        insert into teachers (user_id, full_name, phone, whatsapp, country, city,
                              qualifications, experience_years, ijazat, bio, status)
        values (${user.id}, ${d.full_name}, ${d.phone}, ${d.whatsapp || null}, ${d.country},
                ${d.city || null}, ${d.qualifications}, ${d.experience_years ?? null},
                ${d.ijazat || null}, ${d.bio || null}, 'Pending Review')`;
      return user;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    return { error: "تعذّر إنشاء الحساب" };
  }

  await createSession({ sub: session.id, type: "teacher", email: session.email });
  redirect("/teacher/pending");
}

/** تسجيل الدخول. */
export async function login(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error.issues) };
  }
  const email = parsed.data.email;

  const throttle = await checkThrottle(email);
  if (throttle.locked) {
    return { error: `تم تجاوز عدد المحاولات المسموح. حاول بعد ${throttle.minutes.toLocaleString("ar-EG")} دقيقة.` };
  }

  const [user] = await sql<{ id: string; email: string; password_hash: string; user_type: string }[]>`
    select id, email, password_hash, user_type from users where email = ${email} limit 1`;

  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    await recordFailure(email);
    return { error: "بريد إلكتروني أو كلمة مرور غير صحيحة" };
  }

  await clearThrottle(email);
  await createSession({
    sub: user.id,
    type: user.user_type as "student" | "teacher" | "admin",
    email: user.email,
  });
  redirect(homeForType(user.user_type));
}

/** تسجيل الخروج (server action). */
export async function signOut() {
  await destroySession();
  redirect("/login");
}

/** نسيت كلمة المرور — ينشئ رمزاً ويرسل رابط إعادة التعيين (رسالة عامة دائماً). */
export async function forgotPassword(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: flattenErrors(parsed.error.issues) };
  }
  const generic = { success: "إن كان البريد مسجلاً، فستصلك رسالة لإعادة تعيين كلمة المرور." };

  const [user] = await sql<{ id: string }[]>`select id from users where email = ${parsed.data.email} limit 1`;
  if (!user) return generic; // لا نكشف وجود البريد من عدمه

  const token = randomBytes(32).toString("hex");
  await sql`
    insert into password_resets (token, user_id, expires_at)
    values (${token}, ${user.id}, now() + interval '1 hour')`;

  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const link = `${base}/reset-password?token=${token}`;
  await sendEmail(
    parsed.data.email,
    "إعادة تعيين كلمة المرور — أكاديمية الحفظة",
    `<div dir="rtl" style="font-family:sans-serif">
      <h2>إعادة تعيين كلمة المرور</h2>
      <p>اضغط الرابط التالي لتعيين كلمة مرور جديدة (صالح لمدة ساعة):</p>
      <p><a href="${link}">${link}</a></p>
      <p>إن لم تطلب ذلك، تجاهل هذه الرسالة.</p>
    </div>`,
  );
  return generic;
}

/** إعادة تعيين كلمة المرور برمز صالح. */
export async function resetPassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const token = (formData.get("token") as string) || "";
  const next = (formData.get("new_password") as string) || "";
  const confirm = (formData.get("confirm_password") as string) || "";
  if (next.length < 8) return { fieldErrors: { new_password: "٨ أحرف على الأقل" } };
  if (next !== confirm) return { fieldErrors: { confirm_password: "كلمتا المرور غير متطابقتين" } };

  const [row] = await sql<{ user_id: string }[]>`
    select user_id from password_resets
    where token = ${token} and used = false and expires_at > now() limit 1`;
  if (!row) return { error: "الرابط غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً." };

  await sql.begin(async (tx) => {
    await tx`update users set password_hash = ${await hashPassword(next)} where id = ${row.user_id}`;
    await tx`update password_resets set used = true where token = ${token}`;
    await tx`delete from login_throttle where email = (select email from users where id = ${row.user_id})`;
  });
  return { success: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." };
}
