"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { sql, isDbUnavailable } from "@/lib/db";
import { sendEmail } from "@/lib/email/client";
import { appUrl } from "@/lib/app-url";
import { getBranding } from "@/lib/branding";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { createSession, homeForType } from "@/lib/auth/session";
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

/**
 * بين نشر النسخة وربط قاعدتها، هذه الإجراءات هي أول ما يلمسه صاحب الأكاديمية.
 * بلا هذه الرسالة كان تسجيل الدخول ينهار بخطأ خام لا يدلّ على الخطوة الناقصة.
 */
const DB_DOWN = "قاعدة البيانات غير مربوطة بعد. افتح صفحة /setup لمعرفة الخطوات المتبقية.";

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

/** رمز الاسترجاع يُخزَّن مهشّأً — الرمز الخام يبقى في بريد المستخدم وحده. */
function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
      const [profile] = await tx<{ id: string }[]>`
        insert into students (user_id, full_name, phone, whatsapp, country, city, age, gender,
                              current_level, has_tajweed_experience, package_id, status)
        values (${user.id}, ${d.full_name}, ${d.phone}, ${d.whatsapp || null}, ${d.country},
                ${d.city || null}, ${d.age ?? null}, ${d.gender}, ${d.current_level},
                ${!!d.has_tajweed_experience}, ${d.package_id || null}, 'Pending Payment')
        returning id`;
      return { ...user, profileId: profile.id };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    if (isDbUnavailable(e)) return { error: DB_DOWN };
    return { error: "تعذّر إنشاء الحساب" };
  }

  await createSession({ sub: session.id, type: "student", email: session.email, pid: session.profileId });
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
      const [profile] = await tx<{ id: string }[]>`
        insert into teachers (user_id, full_name, phone, whatsapp, country, city,
                              qualifications, experience_years, ijazat, bio, status)
        values (${user.id}, ${d.full_name}, ${d.phone}, ${d.whatsapp || null}, ${d.country},
                ${d.city || null}, ${d.qualifications}, ${d.experience_years ?? null},
                ${d.ijazat || null}, ${d.bio || null}, 'Pending Review')
        returning id`;
      return { ...user, profileId: profile.id };
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    if (isDbUnavailable(e)) return { error: DB_DOWN };
    return { error: "تعذّر إنشاء الحساب" };
  }

  await createSession({ sub: session.id, type: "teacher", email: session.email, pid: session.profileId });
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

  let throttle: { locked: boolean; minutes: number };
  try {
    throttle = await checkThrottle(email);
  } catch (e) {
    if (isDbUnavailable(e)) return { error: DB_DOWN };
    throw e;
  }
  if (throttle.locked) {
    return { error: `تم تجاوز عدد المحاولات المسموح. حاول بعد ${throttle.minutes.toLocaleString("ar-EG")} دقيقة.` };
  }

  // معرّف الملف يأتي في نفس الاستعلام (بلا رحلة إضافية) ليُخزَّن في التوكن
  const [user] = await sql<
    { id: string; email: string; password_hash: string; user_type: string; profile_id: string | null }[]
  >`
    select u.id, u.email, u.password_hash, u.user_type,
           coalesce(s.id, t.id) as profile_id
    from users u
    left join students s on s.user_id = u.id
    left join teachers t on t.user_id = u.id
    where u.email = ${email} limit 1`;

  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    await recordFailure(email);
    return { error: "بريد إلكتروني أو كلمة مرور غير صحيحة" };
  }

  await clearThrottle(email);
  await createSession({
    sub: user.id,
    type: user.user_type as "student" | "teacher" | "admin",
    email: user.email,
    pid: user.profile_id,
  });
  redirect(homeForType(user.user_type));
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

  // حدّ للطلبات: بدونه يصلح هذا المسار لإغراق أي بريد برسائل باسم الأكاديمية.
  // مفتاح منفصل عن تقييد الدخول كي لا يقفل أحدهما الآخر.
  const throttleKey = `reset:${parsed.data.email}`;
  try {
    if ((await checkThrottle(throttleKey)).locked) return generic;
  } catch (e) {
    // الرسالة العامة هنا كذب: لا رسالة سترسَل ولا قاعدة تُقرأ
    if (isDbUnavailable(e)) return { error: DB_DOWN };
    throw e;
  }
  await recordFailure(throttleKey);

  const [user] = await sql<{ id: string }[]>`select id from users where email = ${parsed.data.email} limit 1`;
  if (!user) return generic; // لا نكشف وجود البريد من عدمه

  // يُخزَّن هاش الرمز لا الرمز: من يقرأ الجدول (نسخة احتياطية، حقن قراءة)
  // لا يستطيع انتحال روابط إعادة التعيين.
  const token = randomBytes(32).toString("hex");
  await sql`
    insert into password_resets (token, user_id, expires_at)
    values (${hashToken(token)}, ${user.id}, now() + interval '1 hour')`;

  const base = appUrl();
  const link = `${base}/reset-password?token=${token}`;
  const { branding } = await getBranding();
  await sendEmail(
    parsed.data.email,
    `إعادة تعيين كلمة المرور — ${branding.fullName}`,
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

  const hashed = hashToken(token);
  let row: { user_id: string } | undefined;
  try {
    [row] = await sql<{ user_id: string }[]>`
      select user_id from password_resets
      where token = ${hashed} and used = false and expires_at > now() limit 1`;
  } catch (e) {
    if (isDbUnavailable(e)) return { error: DB_DOWN };
    throw e;
  }
  if (!row) return { error: "الرابط غير صالح أو منتهي الصلاحية. اطلب رابطاً جديداً." };

  const passwordHash = await hashPassword(next);
  await sql.begin(async (tx) => {
    await tx`update users set password_hash = ${passwordHash} where id = ${row.user_id}`;
    await tx`update password_resets set used = true where token = ${hashed}`;
    // إبطال بقية روابط الاسترجاع المعلّقة لنفس المستخدم
    await tx`update password_resets set used = true where user_id = ${row.user_id} and used = false`;
    await tx`delete from login_throttle where email = (select email from users where id = ${row.user_id})`;
  });
  return { success: "تم تغيير كلمة المرور بنجاح. يمكنك تسجيل الدخول الآن." };
}
