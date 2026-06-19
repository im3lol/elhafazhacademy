import { sql } from "@/lib/db";
import type { SessionUser } from "@/lib/auth/session";
import type { ComplaintRow } from "@/components/complaints/complaints-list";
import type { Msg } from "@/components/complaints/complaint-thread";

/** SQL لاسم العرض لمستخدم حسب نوعه. */
const displayName = (userCol: string) => sql`
  coalesce(
    (select full_name from students where user_id = ${sql.unsafe(userCol)}),
    (select full_name from teachers where user_id = ${sql.unsafe(userCol)}),
    (select full_name from admin_users where user_id = ${sql.unsafe(userCol)}),
    (select email from users where id = ${sql.unsafe(userCol)})
  )`;

/** قائمة التذاكر: الأدمن يرى الكل، غيره يرى تذاكره. */
export async function listComplaints(user: SessionUser): Promise<ComplaintRow[]> {
  if (user.userType === "admin") {
    return sql<ComplaintRow[]>`
      select c.id, c.category, c.subject, c.status, c.created_at,
             ${displayName("c.created_by_user_id")} as creator_name
      from complaints c order by c.created_at desc`;
  }
  return sql<ComplaintRow[]>`
    select c.id, c.category, c.subject, c.status, c.created_at
    from complaints c
    where c.created_by_user_id = ${user.id} or c.against_user_id = ${user.id}
    order by c.created_at desc`;
}

/** اسم العرض لمنشئ التذكرة. */
export async function getCreatorName(userId: string): Promise<string | null> {
  const [r] = await sql<{ name: string | null }[]>`select ${displayName("u.id")} as name from users u where u.id = ${userId} limit 1`;
  return r?.name ?? null;
}

/** رسائل التذكرة مع أسماء المرسلين. */
export async function getMessages(complaintId: string, currentUserId: string): Promise<Msg[]> {
  return sql<Msg[]>`
    select m.id, m.message, m.created_at,
           ${displayName("m.sender_user_id")} as sender_name,
           (select user_type from users where id = m.sender_user_id) as sender_type,
           (m.sender_user_id = ${currentUserId}) as is_mine
    from complaint_messages m
    where m.complaint_id = ${complaintId}
    order by m.created_at asc`;
}
