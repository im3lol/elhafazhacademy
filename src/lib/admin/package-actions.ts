"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { packageSchema } from "@/lib/validators/package";

export type PackageState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

async function ensureAdmin() {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin") throw new Error("غير مصرّح");
  return u;
}

function flatten(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fe: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0] != null ? String(i.path[0]) : "";
    if (k && !fe[k]) fe[k] = i.message;
  }
  return fe;
}

/** إنشاء باقة. */
export async function createPackage(_prev: PackageState, formData: FormData): Promise<PackageState> {
  await ensureAdmin();
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.issues), error: "تحقق من الحقول" };
  const d = parsed.data;
  await sql`
    insert into packages (name, description, classes_per_month, hours_per_month, price, currency, duration_days, type, is_active)
    values (${d.name}, ${d.description || null}, ${d.classes_per_month ?? null}, ${d.hours_per_month ?? null},
            ${d.price}, ${d.currency}, ${d.duration_days}, ${d.type || null}, ${d.is_active})`;
  revalidatePath("/admin/packages");
  revalidatePath("/");
  revalidatePath("/register/student");
  return { success: "تمت إضافة الباقة." };
}

/** تعديل باقة. */
export async function updatePackage(_prev: PackageState, formData: FormData): Promise<PackageState> {
  await ensureAdmin();
  const id = formData.get("id") as string;
  const parsed = packageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: flatten(parsed.error.issues), error: "تحقق من الحقول" };
  const d = parsed.data;
  await sql`
    update packages set
      name = ${d.name}, description = ${d.description || null},
      classes_per_month = ${d.classes_per_month ?? null}, hours_per_month = ${d.hours_per_month ?? null},
      price = ${d.price}, currency = ${d.currency}, duration_days = ${d.duration_days},
      type = ${d.type || null}, is_active = ${d.is_active}
    where id = ${id}`;
  revalidatePath("/admin/packages");
  revalidatePath("/");
  revalidatePath("/register/student");
  return { success: "تم حفظ التعديلات." };
}

/** تفعيل/إيقاف باقة. */
export async function togglePackage(formData: FormData) {
  await ensureAdmin();
  const id = formData.get("id") as string;
  await sql`update packages set is_active = not is_active where id = ${id}`;
  revalidatePath("/admin/packages");
  revalidatePath("/");
  revalidatePath("/register/student");
}

/** حذف باقة (إن لم تكن مرتبطة بطلاب/اشتراكات). */
export async function deletePackage(formData: FormData) {
  await ensureAdmin();
  const id = formData.get("id") as string;
  const [used] = await sql<{ n: number }[]>`
    select (
      (select count(*) from students where package_id = ${id}) +
      (select count(*) from student_subscriptions where package_id = ${id})
    )::int as n`;
  if (used && used.n > 0) {
    // بدل الحذف: إيقاف الباقة لتفادي كسر المراجع
    await sql`update packages set is_active = false where id = ${id}`;
  } else {
    await sql`delete from packages where id = ${id}`;
  }
  revalidatePath("/admin/packages");
  revalidatePath("/");
  revalidatePath("/register/student");
}
