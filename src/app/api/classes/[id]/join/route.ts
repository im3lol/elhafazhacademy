import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Row = { meet_link: string | null; s_user: string; t_user: string };

/**
 * يسجّل نقر «دخول الحصة» (وقت أول نقرة) ثم يحوّل لرابط Meet.
 * الطالب → student_join_clicked_at · المعلم → teacher_join_clicked_at · الأدمن → admin_monitor_joined_at.
 */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.redirect(new URL("/login", req.url));

  const [c] = await sql<Row[]>`
    select c.meet_link, su.id as s_user, tu.id as t_user
    from classes c
    join students s on s.id = c.student_id
    join users su on su.id = s.user_id
    join teachers t on t.id = c.teacher_id
    join users tu on tu.id = t.user_id
    where c.id = ${id} limit 1`;
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (user.id === c.s_user) {
    await sql`update classes set student_join_clicked_at = coalesce(student_join_clicked_at, now()) where id = ${id}`;
  } else if (user.id === c.t_user) {
    await sql`update classes set teacher_join_clicked_at = coalesce(teacher_join_clicked_at, now()) where id = ${id}`;
  } else if (user.userType === "admin") {
    await sql`update classes set admin_monitor_joined_at = coalesce(admin_monitor_joined_at, now()) where id = ${id}`;
  } else {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (!c.meet_link) return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.redirect(c.meet_link);
}
