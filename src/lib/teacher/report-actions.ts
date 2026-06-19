"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { reportSchema, mistakesArraySchema, computeOverall } from "@/lib/validators/report";
import { ensureEarningForClass } from "@/lib/finance/earnings";
import { notifyStudent } from "@/lib/notifications/service";
import { loadAchievementCtx, reconcileAchievements } from "@/lib/student/progress";

export type ReportState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function flatten(issues: readonly { path: PropertyKey[]; message: string }[]) {
  const fe: Record<string, string> = {};
  for (const i of issues) {
    const k = i.path[0] != null ? String(i.path[0]) : "";
    if (k && !fe[k]) fe[k] = i.message;
  }
  return fe;
}

/** يتحقق أن المعلم الحالي يملك الحصة، ويُرجع (teacherId, class). */
async function ownedClass(classId: string) {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  const [teacher] = await sql<{ id: string }[]>`select id from teachers where user_id = ${u.id} limit 1`;
  if (!teacher) throw new Error("لا يوجد ملف معلم");
  const [cls] = await sql<{ id: string; student_id: string; teacher_id: string; subscription_id: string | null }[]>`
    select id, student_id, teacher_id, subscription_id from classes where id = ${classId} limit 1`;
  if (!cls || cls.teacher_id !== teacher.id) throw new Error("الحصة غير موجودة أو لا تخصّك");
  return { teacherId: teacher.id, cls };
}

/** تسجيل تقرير حصة + الأخطاء + تحديث الحالة والاستهلاك. */
export async function recordLessonReport(
  _prev: ReportState,
  formData: FormData,
): Promise<ReportState> {
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: flatten(parsed.error.issues), error: "تحقق من الحقول" };
  }
  const d = parsed.data;
  const { teacherId, cls } = await ownedClass(d.class_id);

  // غياب الطالب → تحديث الحالة فقط
  if (!d.attended) {
    await sql`update classes set status = 'no_show_student' where id = ${cls.id}`;
    revalidatePath("/teacher/dashboard");
    redirect("/teacher/dashboard");
  }

  // الأخطاء (JSON من الحقل المخفي)
  let mistakes: ReturnType<typeof mistakesArraySchema.parse> = [];
  const raw = formData.get("mistakes");
  if (typeof raw === "string" && raw.trim()) {
    const p = mistakesArraySchema.safeParse(JSON.parse(raw));
    if (p.success) mistakes = p.data;
  }

  const overall = computeOverall(
    d.memorization_score, d.tajweed_score, d.fluency_score, d.commitment_score,
  );

  await sql.begin(async (tx) => {
    const [report] = await tx<{ id: string }[]>`
      insert into lesson_reports (class_id, student_id, teacher_id, lesson_type, surah_name,
        ayah_from, ayah_to, memorization_score, tajweed_score, fluency_score, commitment_score,
        overall_score, teacher_notes, homework)
      values (${cls.id}, ${cls.student_id}, ${teacherId}, ${d.lesson_type}, ${d.surah_name || null},
        ${d.ayah_from ?? null}, ${d.ayah_to ?? null}, ${d.memorization_score}, ${d.tajweed_score},
        ${d.fluency_score}, ${d.commitment_score}, ${overall}, ${d.teacher_notes || null}, ${d.homework || null})
      returning id`;

    for (const m of mistakes) {
      await tx`
        insert into student_mistakes (student_id, lesson_report_id, mistake_category, mistake_type,
          surah_name, ayah_number, description, severity, status)
        values (${cls.student_id}, ${report.id}, ${m.category}, ${m.type},
          ${m.surah_name || null}, ${m.ayah_number ?? null}, ${m.description || null}, ${m.severity}, 'new')`;
    }

    await tx`update classes set status = 'completed' where id = ${cls.id}`;
    if (cls.subscription_id) {
      await tx`update student_subscriptions set classes_used = classes_used + 1 where id = ${cls.subscription_id}`;
    }
    // احتساب مستحق المعلم لهذه الحصة
    await ensureEarningForClass(tx, cls.id);
  });

  // إشعار الطالب بصدور تقرير حصته (وواجبه إن وُجد)
  const homeworkLine = d.homework ? ` الواجب: ${d.homework}` : "";
  await notifyStudent(
    cls.student_id,
    "صدر تقرير حصتك 📋",
    `سجّل معلمك تقرير حصتك (التقييم العام ${overall}٪).${homeworkLine}`,
  );

  // منح الإنجازات المكتسَبة بعد هذه الحصة (بتوقيت الحدث) + إشعار الطالب بكل إنجاز جديد
  const [stu] = await sql<{ memorized_parts: string | null }[]>`
    select memorized_parts from students where id = ${cls.student_id} limit 1`;
  const ctx = await loadAchievementCtx(cls.student_id, Number(stu?.memorized_parts ?? 0));
  await reconcileAchievements(cls.student_id, ctx, true);

  revalidatePath("/teacher/dashboard");
  redirect("/teacher/dashboard");
}
