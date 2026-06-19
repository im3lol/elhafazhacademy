import { notFound, redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { LessonReportForm } from "@/components/teacher/lesson-report-form";
import { LessonReportView, type ReportDetail, type ReportMistake } from "@/components/teacher/lesson-report-view";
import { formatClassTime } from "@/lib/class-status";
import { TOTAL_PAGES } from "@/lib/mushaf/data";
import { getMushafNav } from "@/lib/mushaf/nav";

type ClassRow = {
  id: string;
  start_time: string;
  status: string;
  student_id: string;
  student_name: string;
  has_report: boolean;
};

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user || user.userType !== "teacher") redirect("/login");

  const [cls] = await sql<ClassRow[]>`
    select c.id, c.start_time, c.status, c.student_id, s.full_name as student_name,
           exists(select 1 from lesson_reports r where r.class_id = c.id) as has_report
    from classes c
    join students s on s.id = c.student_id
    join teachers t on t.id = c.teacher_id
    where c.id = ${id} and t.user_id = ${user.id}
    limit 1`;

  if (!cls) notFound();

  const reportNeeded = !cls.has_report;

  type LiveMistake = { surah_number: number; ayah_number: number; mistake_type: string; title: string | null; note: string | null };

  // إن وُجد تقرير: اجلبه مع أخطائه للعرض. وإلا: جهّز بيانات المصحف + أخطاء المصحف المباشر المسجَّلة في هذه الحصة.
  const [nav, progressRows, reportRows, reportMistakes, liveMistakes] = reportNeeded
    ? await Promise.all([
        getMushafNav(),
        sql<{ page_number: number | null }[]>`
          select page_number from student_mushaf_progress where student_id = ${cls.student_id} limit 1`,
        Promise.resolve([] as ReportDetail[]),
        Promise.resolve([] as ReportMistake[]),
        sql<LiveMistake[]>`
          select surah_number, ayah_number, mistake_type, title, note
          from student_mushaf_mistakes where class_id = ${cls.id} order by created_at`,
      ])
    : await Promise.all([
        Promise.resolve({ surahNav: [], juzNav: [], totalPages: TOTAL_PAGES }),
        Promise.resolve([] as { page_number: number | null }[]),
        sql<(ReportDetail & { id: string })[]>`
          select id, lesson_type, surah_name, ayah_from, ayah_to,
                 memorization_score, tajweed_score, fluency_score, commitment_score, overall_score,
                 teacher_notes, homework
          from lesson_reports where class_id = ${cls.id} order by created_at desc limit 1`,
        sql<ReportMistake[]>`
          select sm.id, sm.mistake_category, sm.mistake_type, sm.surah_name, sm.ayah_number,
                 sm.severity, sm.status, sm.description
          from student_mistakes sm
          join lesson_reports lr on lr.id = sm.lesson_report_id
          where lr.class_id = ${cls.id}
          order by sm.created_at`,
        Promise.resolve([] as LiveMistake[]),
      ]);

  const { surahNav, juzNav, totalPages } = nav;
  const initialPage = Number(progressRows[0]?.page_number ?? 1);
  const report = reportRows[0] ?? null;

  // تحويل أخطاء المصحف المباشر إلى أخطاء أوّلية في نموذج التقرير (تُستثنى "ممتاز" لأنها ليست خطأ).
  const CAT_MAP: Record<string, "memorization" | "tajweed" | "pronunciation"> = {
    tajweed: "tajweed",
    waqf_ibtida: "tajweed",
    memorization: "memorization",
    needs_review: "memorization",
  };
  const surahNameOf = (n: number) => surahNav.find((s) => s.number === n)?.name_ar ?? "";
  const initialMistakes = liveMistakes
    .filter((m) => m.mistake_type !== "excellent")
    .map((m) => ({
      category: CAT_MAP[m.mistake_type] ?? ("tajweed" as const),
      type: m.title ?? "",
      surah_name: surahNameOf(m.surah_number),
      ayah_number: String(m.ayah_number),
      severity: "medium" as const,
      description: m.note ?? "",
    }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">
          {cls.has_report ? "تقرير الحصة" : "تسجيل تقرير الحصة"}
        </h1>
        <p className="mt-1 text-muted">
          الطالب {cls.student_name} · <span dir="rtl">{formatClassTime(cls.start_time)}</span>
        </p>
      </div>

      {cls.has_report ? (
        report ? (
          <LessonReportView report={report} mistakes={reportMistakes} />
        ) : (
          <div className="rounded-2xl border border-border p-5 text-sm text-muted">تعذّر تحميل التقرير.</div>
        )
      ) : (
        <LessonReportForm
          classId={cls.id}
          studentName={cls.student_name}
          surahNav={surahNav}
          juzNav={juzNav}
          totalPages={totalPages}
          initialPage={initialPage}
          initialMistakes={initialMistakes}
        />
      )}
    </div>
  );
}
