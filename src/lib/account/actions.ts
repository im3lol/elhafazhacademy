"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { sql } from "@/lib/db";
import { getSessionUser, createSession } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { logAudit } from "@/lib/audit";

export type AccountState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

/** تحديث بيانات الملف الشخصي (الاسم/الهاتف/واتساب). */
export async function updateProfile(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const u = await getSessionUser();
  if (!u) return { error: "غير مصرّح" };

  const fullName = ((formData.get("full_name") as string) || "").trim();
  const phone = ((formData.get("phone") as string) || "").trim() || null;
  const whatsapp = ((formData.get("whatsapp") as string) || "").trim() || null;
  if (fullName.length < 2) return { fieldErrors: { full_name: "الاسم مطلوب" } };

  // معاملة واحدة: تحديثان منفصلان كانا يتركان الهاتف مختلفاً بين الجدولين
  // إن أخفق الثاني.
  await sql.begin(async (tx) => {
    if (u.userType === "student") {
      await tx`update students set full_name = ${fullName}, phone = ${phone}, whatsapp = ${whatsapp} where user_id = ${u.id}`;
    } else if (u.userType === "teacher") {
      await tx`update teachers set full_name = ${fullName}, phone = ${phone}, whatsapp = ${whatsapp} where user_id = ${u.id}`;
    } else {
      // بلا هذا الفرع كان اسم الأدمن يُهمَل بصمت ثم يُبلَّغ بالنجاح
      // (admin_users بلا عمودَي هاتف/واتساب — يُحفظان في users أدناه).
      await tx`update admin_users set full_name = ${fullName} where user_id = ${u.id}`;
    }
    await tx`update users set phone = ${phone}, whatsapp = ${whatsapp} where id = ${u.id}`;
  });

  revalidatePath(`/${u.userType}/settings`);
  return { success: "تم حفظ بياناتك." };
}

/** تغيير كلمة المرور (مع التحقق من الحالية). */
export async function changePassword(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const u = await getSessionUser();
  if (!u) return { error: "غير مصرّح" };

  const current = (formData.get("current_password") as string) || "";
  const next = (formData.get("new_password") as string) || "";
  const confirm = (formData.get("confirm_password") as string) || "";

  if (next.length < 8) return { fieldErrors: { new_password: "٨ أحرف على الأقل" } };
  if (next !== confirm) return { fieldErrors: { confirm_password: "كلمتا المرور غير متطابقتين" } };

  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${u.id} limit 1`;
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { fieldErrors: { current_password: "كلمة المرور الحالية غير صحيحة" } };
  }

  await sql`update users set password_hash = ${await hashPassword(next)} where id = ${u.id}`;
  return { success: "تم تغيير كلمة المرور." };
}

const emailSchema = z.string().trim().toLowerCase().email("بريد إلكتروني غير صالح");

/**
 * تغيير البريد الإلكتروني — وهو **معرّف الدخول** في هذا النظام (لا اسم مستخدم منفصل).
 * لذلك يُطلب التحقّق من كلمة المرور الحالية كما في تغييرها.
 */
export async function changeEmail(_prev: AccountState, formData: FormData): Promise<AccountState> {
  const u = await getSessionUser();
  if (!u) return { error: "غير مصرّح" };

  const parsed = emailSchema.safeParse((formData.get("new_email") as string) || "");
  if (!parsed.success) return { fieldErrors: { new_email: parsed.error.issues[0].message } };
  const email = parsed.data;
  const current = (formData.get("current_password") as string) || "";

  if (email === u.email.toLowerCase()) {
    return { fieldErrors: { new_email: "هذا بريدك الحالي" } };
  }

  const [row] = await sql<{ password_hash: string }[]>`select password_hash from users where id = ${u.id} limit 1`;
  if (!row || !(await verifyPassword(current, row.password_hash))) {
    return { fieldErrors: { current_password: "كلمة المرور الحالية غير صحيحة" } };
  }

  try {
    await sql.begin(async (tx) => {
      await tx`update users set email = ${email} where id = ${u.id}`;
      // رابط استعادة أُرسل إلى البريد القديم يجب ألّا يبقى صالحاً بعد نقل الحساب
      await tx`delete from password_resets where user_id = ${u.id}`;
      await logAudit(u.id, "account.email_changed", "users", u.id, { from: u.email, to: email }, tx);
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505") {
      return { fieldErrors: { new_email: "هذا البريد مستخدم بالفعل" } };
    }
    return { error: "تعذّر تغيير البريد. حاول مجدداً." };
  }

  // توكن الجلسة يحمل البريد؛ بلا تجديده تبقى الجلسة على القديم حتى انتهائها (٧ أيام)
  await createSession({ sub: u.id, type: u.userType, email, pid: u.profileId });

  revalidatePath(`/${u.userType}/settings`);
  return { success: `تم تغيير بريدك إلى ${email}. استخدمه في تسجيل الدخول القادم.` };
}
