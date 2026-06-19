"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { deleteSetting, setSetting, ACADEMY_PAYMENT_KEY } from "@/lib/settings";
import { GOOGLE_SETTING_KEY } from "@/lib/google/client";
import { TELEGRAM_SETTING_KEY } from "@/lib/telegram/client";
import { logAudit } from "@/lib/audit";
import { requirePermission } from "@/lib/auth/guards";

async function ensureAdmin() {
  return requirePermission("settings.manage");
}

/** فصل ربط حساب Google. */
export async function disconnectGoogle() {
  const admin = await ensureAdmin();
  await deleteSetting(GOOGLE_SETTING_KEY);
  await logAudit(admin.id, "settings.google_disconnect", "settings", null);
  revalidatePath("/admin/settings");
}

/** حفظ بيانات التحويل التي تظهر للطالب في صفحة الدفع. */
export async function saveAcademyPayment(formData: FormData) {
  const admin = await ensureAdmin();
  const get = (k: string) => ((formData.get(k) as string) || "").trim();
  await setSetting(ACADEMY_PAYMENT_KEY, {
    method_label: get("method_label"),
    account_number: get("account_number"),
    account_holder: get("account_holder"),
    instructions: get("instructions"),
  });
  await logAudit(admin.id, "settings.payment_update", "settings", null);
  revalidatePath("/admin/settings");
  revalidatePath("/student/payment");
  redirect("/admin/settings?saved=payment");
}

/** حفظ إعداد بوت تيليجرام (التوكن واسم البوت والسر) — يُدار من الأدمن. */
export async function saveTelegramConfig(formData: FormData) {
  const admin = await ensureAdmin();
  const get = (k: string) => ((formData.get(k) as string) || "").trim();
  await setSetting(TELEGRAM_SETTING_KEY, {
    bot_token: get("bot_token"),
    bot_username: get("bot_username").replace(/^@/, ""),
    webhook_secret: get("webhook_secret"),
  });
  await logAudit(admin.id, "settings.telegram_update", "settings", null);
  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=telegram");
}

/** فصل تكامل تيليجرام بالكامل (حذف الإعداد). */
export async function disconnectTelegram() {
  const admin = await ensureAdmin();
  await deleteSetting(TELEGRAM_SETTING_KEY);
  await logAudit(admin.id, "settings.telegram_disconnect", "settings", null);
  revalidatePath("/admin/settings");
}
