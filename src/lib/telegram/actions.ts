"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { basePathFor } from "@/lib/complaints/config";

/** ينشئ رمز ربط لمستخدم (يستخدمه في رابط البوت العميق). */
export async function createTelegramLink(): Promise<void> {
  const u = await getSessionUser();
  if (!u) return;
  const code = randomBytes(8).toString("hex");
  await sql`update users set telegram_link_code = ${code} where id = ${u.id}`;
  revalidatePath(`${basePathFor(u.userType)}/notifications`);
}

/** يلغي ربط تيليجرام للمستخدم الحالي. */
export async function unlinkTelegram(): Promise<void> {
  const u = await getSessionUser();
  if (!u) return;
  await sql`update users set telegram_chat_id = null, telegram_link_code = null where id = ${u.id}`;
  revalidatePath(`${basePathFor(u.userType)}/notifications`);
}
