"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { basePathFor } from "@/lib/complaints/config";

/** تحديد كل إشعارات المستخدم كمقروءة. */
export async function markAllRead(): Promise<void> {
  const u = await getSessionUser();
  if (!u) return;
  await sql`
    update notifications set status = 'read'
    where user_id = ${u.id} and channel = 'app' and status <> 'read'`;
  const base = basePathFor(u.userType);
  revalidatePath(`${base}/notifications`);
  revalidatePath(`${base}/dashboard`);
}

/** تحديد إشعار واحد كمقروء (مقيّد بمالك الإشعار). */
export async function markRead(formData: FormData): Promise<void> {
  const u = await getSessionUser();
  if (!u) return;
  const id = formData.get("id") as string;
  await sql`
    update notifications set status = 'read'
    where id = ${id} and user_id = ${u.id} and channel = 'app' and status <> 'read'`;
  const base = basePathFor(u.userType);
  revalidatePath(`${base}/notifications`);
  revalidatePath(`${base}/dashboard`);
}
