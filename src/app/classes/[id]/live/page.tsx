import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { buttonClasses } from "@/components/ui/button";
import { LiveMushafRoom, type MarkedWord } from "@/components/mushaf/live-mushaf-room";
import { getMushafNav } from "@/lib/mushaf/nav";

type ClassRow = {
  student_id: string;
  student_name: string;
  teacher_name: string;
  status: string;
  meet_link: string | null;
  live_page: number | null;
  s_user: string;
  t_user: string;
};

export default async function LiveClassRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [cls] = await sql<ClassRow[]>`
    select c.student_id, s.full_name as student_name, t.full_name as teacher_name,
           c.status, c.meet_link, c.live_page, su.id as s_user, tu.id as t_user
    from classes c
    join students s on s.id = c.student_id
    join users su on su.id = s.user_id
    join teachers t on t.id = c.teacher_id
    join users tu on tu.id = t.user_id
    where c.id = ${id} limit 1`;
  if (!cls) notFound();

  let role: "teacher" | "student" | "admin" | null = null;
  if (user.id === cls.t_user) role = "teacher";
  else if (user.id === cls.s_user) role = "student";
  else if (user.userType === "admin") role = "admin";
  if (!role) notFound();

  const backHref = role === "teacher" ? "/teacher/schedule" : role === "student" ? "/student/schedule" : "/admin/classes";

  const [{ surahNav, juzNav, totalPages }, progressRows, mistakeRows] = await Promise.all([
    getMushafNav(),
    sql<{ page_number: number | null }[]>`
      select page_number from student_mushaf_progress where student_id = ${cls.student_id} limit 1`,
    // الأخطاء المفتوحة لإبرازها على المصحف (المعلم يتفادى التكرار، والطالب يراها لحظياً)
    sql<MarkedWord[]>`
      select surah_number, ayah_number, word_index, mistake_type
      from student_mushaf_mistakes where student_id = ${cls.student_id} and not is_resolved`,
  ]);

  const initialPage = Number(cls.live_page ?? progressRows[0]?.page_number ?? 1);

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black sm:text-3xl">المصحف المباشر — الحصة</h1>
          <p className="mt-1 text-sm text-muted">
            {role === "student" ? `مع المعلم ${cls.teacher_name}` : `الطالب ${cls.student_name}`}
            {role === "teacher" && " · أنت تعرض، والطالب يتابع صفحتك"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {cls.meet_link && (
            <a href={`/api/classes/${id}/join`} target="_blank" rel="noopener noreferrer" className={buttonClasses({ size: "sm" })}>
              فتح Meet ↗
            </a>
          )}
          <Link href={backHref} className={buttonClasses({ size: "sm", variant: "outline" })}>
            → الجدول
          </Link>
        </div>
      </div>

      <LiveMushafRoom
        classId={id}
        studentId={cls.student_id}
        role={role}
        surahNav={surahNav}
        juzNav={juzNav}
        totalPages={totalPages}
        initialPage={initialPage}
        mistakes={mistakeRows}
      />
    </div>
  );
}
