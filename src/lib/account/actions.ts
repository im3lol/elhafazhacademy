"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

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

  if (u.userType === "student") {
    await sql`update students set full_name = ${fullName}, phone = ${phone}, whatsapp = ${whatsapp} where user_id = ${u.id}`;
  } else if (u.userType === "teacher") {
    await sql`update teachers set full_name = ${fullName}, phone = ${phone}, whatsapp = ${whatsapp} where user_id = ${u.id}`;
  }
  await sql`update users set phone = ${phone}, whatsapp = ${whatsapp} where id = ${u.id}`;

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
