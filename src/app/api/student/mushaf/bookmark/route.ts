import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

async function currentStudent() {
  const u = await getSessionUser();
  if (!u || u.userType !== "student") return null;
  const [s] = await sql<{ id: string }[]>`select id from students where user_id = ${u.id} limit 1`;
  return s?.id ?? null;
}

/** يبدّل علامة مرجعية لصفحة (يضيف إن لم توجد ويحذف إن وُجدت). */
export async function POST(req: Request) {
  const studentId = await currentStudent();
  if (!studentId) return Response.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { page?: number; label?: string };
  const page = Number(body.page);
  if (!Number.isInteger(page) || page < 1 || page > 604) {
    return Response.json({ error: "invalid page" }, { status: 400 });
  }
  const label = typeof body.label === "string" ? body.label.trim().slice(0, 120) || null : null;

  const deleted = await sql`
    delete from student_mushaf_bookmarks where student_id = ${studentId} and page_number = ${page} returning id`;
  if (deleted.length > 0) return Response.json({ bookmarked: false });

  await sql`
    insert into student_mushaf_bookmarks (student_id, page_number, label)
    values (${studentId}, ${page}, ${label})`;
  return Response.json({ bookmarked: true });
}
