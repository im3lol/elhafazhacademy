"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import type { ActionState } from "@/lib/auth/actions";

/** قفل استشاري ثابت — يمنع طلبَين متزامنَين من تجاوز فحص «لا يوجد أدمن». */
const SETUP_LOCK = 728104;

const schema = z
  .object({
    full_name: z.string().min(3, "الاسم الكامل مطلوب"),
    email: z.string().email("بريد إلكتروني غير صالح"),
    password: z.string().min(8, "كلمة المرور ٨ أحرف على الأقل"),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    path: ["confirm"],
    message: "كلمتا المرور غير متطابقتين",
  });

/** هل القاعدة مهيّأة وبلا أي أدمن؟ تُستخدم لفتح/إغلاق صفحة التركيب. */
export async function setupState(): Promise<"ready" | "done" | "no-schema"> {
  try {
    const [{ n }] = await sql<{ n: number }[]>`select count(*)::int as n from admin_users`;
    return n === 0 ? "ready" : "done";
  } catch {
    // الجدول غير موجود ⇒ سكربت التهيئة لم يعمل بعد
    return "no-schema";
  }
}

/** إنشاء أول حساب أدمن. متاح مرة واحدة فقط — على قاعدة بلا أدمن. */
export async function createFirstAdmin(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) {
      const k = i.path[0] != null ? String(i.path[0]) : "";
      if (k && !fieldErrors[k]) fieldErrors[k] = i.message;
    }
    return { fieldErrors, error: "تحقق من الحقول المحددة" };
  }
  const d = parsed.data;
  const passwordHash = await hashPassword(d.password);

  let session: { id: string; pid: string } | null = null;
  try {
    session = await sql.begin(async (tx) => {
      // القفل داخل المعاملة: الفحص والإنشاء ذرّيان معاً، فلا يسبق طلبٌ آخر إلى الإنشاء
      await tx`select pg_advisory_xact_lock(${SETUP_LOCK})`;
      const [{ n }] = await tx<{ n: number }[]>`select count(*)::int as n from admin_users`;
      if (n > 0) return null;

      const [user] = await tx<{ id: string }[]>`
        insert into users (email, password_hash, user_type, status)
        values (${d.email}, ${passwordHash}, 'admin', 'active')
        returning id`;
      const [role] = await tx<{ id: string }[]>`
        select id from roles where name = 'super_admin' limit 1`;
      const [profile] = await tx<{ id: string }[]>`
        insert into admin_users (user_id, full_name, role_id, status)
        values (${user.id}, ${d.full_name}, ${role?.id ?? null}, 'Active')
        returning id`;
      return { id: user.id, pid: profile.id };
    });
  } catch (e) {
    if (typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505") {
      return { error: "هذا البريد مسجّل بالفعل" };
    }
    return { error: "تعذّر إنشاء الحساب — تأكد أن قاعدة البيانات مهيّأة." };
  }

  if (!session) return { error: "تم إنشاء حساب الإدارة بالفعل. سجّل الدخول." };

  await createSession({ sub: session.id, type: "admin", email: d.email, pid: session.pid });
  redirect("/admin/dashboard");
}
