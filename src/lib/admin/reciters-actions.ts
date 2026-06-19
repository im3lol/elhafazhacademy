"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { requirePermission } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";

export type ReciterFormState = { error?: string; success?: string };

/** إضافة قارئ جديد (المصدر = مجلد everyayah.com مثل Husary_Muallim_128kbps). */
export async function addReciter(_prev: ReciterFormState, formData: FormData): Promise<ReciterFormState> {
  const admin = await requirePermission("settings.manage");

  const nameAr = String(formData.get("name_ar") ?? "").trim();
  const nameEn = (String(formData.get("name_en") ?? "").trim()) || null;
  const source = String(formData.get("source") ?? "").trim();

  if (nameAr.length < 2 || nameAr.length > 120) return { error: "اسم القارئ مطلوب (٢–١٢٠ حرفاً)" };
  if (!/^\d+$/.test(source)) return { error: "المصدر يجب أن يكون معرّف التلاوة الرقمي من quran.com (مثل 6)" };

  const [exists] = await sql<{ id: string }[]>`select id from reciters where source = ${source} limit 1`;
  if (exists) return { error: "هذا المصدر مُضاف بالفعل" };

  await sql`insert into reciters (name_ar, name_en, source) values (${nameAr}, ${nameEn}, ${source})`;
  await logAudit(admin.id, "reciter.add", "reciter", null, { source });
  revalidatePath("/admin/reciters");
  return { success: `تمت إضافة القارئ ${nameAr}` };
}

/** تفعيل/تعطيل قارئ. */
export async function toggleReciterActive(formData: FormData) {
  const admin = await requirePermission("settings.manage");
  const id = formData.get("reciter_id") as string;
  const [r] = await sql<{ is_active: boolean }[]>`
    update reciters set is_active = not is_active where id = ${id} returning is_active`;
  await logAudit(admin.id, "reciter.toggle", "reciter", id, { is_active: r?.is_active });
  revalidatePath("/admin/reciters");
}

/** حذف قارئ. */
export async function deleteReciter(formData: FormData) {
  const admin = await requirePermission("settings.manage");
  const id = formData.get("reciter_id") as string;
  await sql`delete from reciters where id = ${id}`;
  await logAudit(admin.id, "reciter.delete", "reciter", id, null);
  revalidatePath("/admin/reciters");
}
