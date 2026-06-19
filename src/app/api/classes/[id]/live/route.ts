import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { isValidMushafPage } from "@/lib/mushaf/data";

export const dynamic = "force-dynamic";

// تحديد معدّل بسيط في الذاكرة: كتابة واحدة لكل (حصة+مستخدم) خلال نافذة قصيرة
const MIN_WRITE_MS = 800;
const lastWrite = new Map<string, number>();

type Row = {
  status: string;
  live_page: number | null;
  live_updated_at: string | null;
  student_id: string;
  s_user: string;
  t_user: string;
};

type MarkedWord = {
  surah_number: number;
  ayah_number: number;
  word_index: number | null;
  mistake_type: string;
};

/** يحدّد دور المستخدم في الحصة، أو null إن لم يكن طرفاً فيها. */
async function participantRole(classId: string) {
  const user = await getSessionUser();
  if (!user) return { user: null, role: null as null, row: null };
  const [row] = await sql<Row[]>`
    select c.status, c.live_page, c.live_updated_at, c.student_id, su.id as s_user, tu.id as t_user
    from classes c
    join students s on s.id = c.student_id
    join users su on su.id = s.user_id
    join teachers t on t.id = c.teacher_id
    join users tu on tu.id = t.user_id
    where c.id = ${classId} limit 1`;
  if (!row) return { user, role: null as null, row: null };
  let role: "teacher" | "student" | "admin" | null = null;
  if (user.id === row.t_user) role = "teacher";
  else if (user.id === row.s_user) role = "student";
  else if (user.userType === "admin") role = "admin";
  return { user, role, row };
}

/** الطالب/الأدمن يستطلعون موضع العرض الحالي. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { role, row } = await participantRole(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (!role) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  // نبضة حضور: سجّل آخر ظهور للطرف الحالي داخل الغرفة
  if (role === "teacher") await sql`update classes set live_teacher_seen_at = now() where id = ${id}`;
  else if (role === "student") await sql`update classes set live_student_seen_at = now() where id = ${id}`;

  // الحضور محسوب على الخادم (تفادي انحراف ساعة العميل): متصل إن ظهر خلال ٨ ثوانٍ
  const [presence] = await sql<{ t_online: boolean; s_online: boolean }[]>`
    select (live_teacher_seen_at > now() - interval '8 seconds') as t_online,
           (live_student_seen_at > now() - interval '8 seconds') as s_online
    from classes where id = ${id}`;
  const mistakes = await sql<MarkedWord[]>`
    select surah_number, ayah_number, word_index, mistake_type
    from student_mushaf_mistakes where student_id = ${row.student_id} and not is_resolved`;
  return NextResponse.json({
    status: row.status,
    page: row.live_page,
    updatedAt: row.live_updated_at,
    mistakes,
    teacherOnline: presence?.t_online ?? false,
    studentOnline: presence?.s_online ?? false,
  });
}

/** المعلم فقط يبثّ الصفحة المعروضة حالياً. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user, role, row } = await participantRole(id);
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (role !== "teacher") return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const page = Number(body?.page);
  if (!isValidMushafPage(page)) {
    return NextResponse.json({ error: "invalid page" }, { status: 400 });
  }

  // تحديد المعدّل: تجاهل الكتابات المتلاحقة بأسرع من النافذة
  const k = `${id}:${user!.id}`;
  const now = Date.now();
  const prev = lastWrite.get(k) ?? 0;
  if (now - prev < MIN_WRITE_MS) return NextResponse.json({ ok: true, throttled: true });
  lastWrite.set(k, now);

  // لا تبثّ على حصة منتهية/ملغاة، ولا تكتب إن لم تتغيّر الصفحة
  await sql`
    update classes set live_page = ${page}, live_updated_at = now()
    where id = ${id}
      and status not in ('completed','cancelled','no_show_student','no_show_teacher')
      and (live_page is distinct from ${page})`;
  return NextResponse.json({ ok: true, page });
}
