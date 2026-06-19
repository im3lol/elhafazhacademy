"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { notifyStudent } from "@/lib/notifications/service";
import { isMistakeType } from "@/lib/mushaf/data";
import { teacherIdOwningStudent, ownerOfMushafMistake } from "@/lib/mushaf/ownership";

export type MushafState = { error?: string; success?: string };

/** يتحقق أن المستخدم الحالي معلّم يملك هذا الطالب، ويُرجع معرّف المعلم. */
async function teacherForStudent(studentId: string): Promise<{ teacherId: string; userId: string }> {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  const teacherId = await teacherIdOwningStudent(sql, studentId, u.id);
  if (!teacherId) throw new Error("هذا الطالب ليس من طلابك");
  return { teacherId, userId: u.id };
}

/** يتحقق أن الخطأ يخصّ طالباً يملكه المعلم الحالي، ويُرجع student_id ومعرّفات المعلم. */
async function teacherForMistake(mistakeId: string) {
  const u = await getSessionUser();
  if (!u || u.userType !== "teacher") throw new Error("غير مصرّح");
  const owner = await ownerOfMushafMistake(sql, mistakeId, u.id);
  if (!owner) throw new Error("غير موجود");
  return { studentId: owner.studentId, teacherId: owner.teacherId, userId: u.id };
}

async function pageFor(surah: number, ayah: number): Promise<number | null> {
  const [r] = await sql<{ page_number: number | null }[]>`
    select page_number from quran_ayahs where surah_number = ${surah} and ayah_number = ${ayah} limit 1`;
  return r?.page_number ?? null;
}

function parseLocation(formData: FormData) {
  const surah = Number(formData.get("surah_number"));
  const ayah = Number(formData.get("ayah_number"));
  const wordRaw = formData.get("word_index");
  const word = wordRaw != null && String(wordRaw) !== "" ? Number(wordRaw) : null;
  return { surah, ayah, word };
}

/** المعلم يحدّد آخر موضع وصل إليه الطالب (upsert). */
export async function saveMushafProgress(_prev: MushafState, formData: FormData): Promise<MushafState> {
  const studentId = formData.get("student_id") as string;
  let teacherId: string, userId: string;
  try {
    ({ teacherId, userId } = await teacherForStudent(studentId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "خطأ" };
  }

  const { surah, ayah, word } = parseLocation(formData);
  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return { error: "سورة غير صالحة" };
  if (!Number.isInteger(ayah) || ayah < 1) return { error: "آية غير صالحة" };
  const page = await pageFor(surah, ayah);
  if (page === null) return { error: "الآية غير موجودة في هذه السورة" };

  await sql`
    insert into student_mushaf_progress (student_id, teacher_id, surah_number, ayah_number, word_index, page_number)
    values (${studentId}, ${teacherId}, ${surah}, ${ayah}, ${word}, ${page})
    on conflict (student_id) do update set
      teacher_id = ${teacherId}, surah_number = ${surah}, ayah_number = ${ayah},
      word_index = ${word}, page_number = ${page}, updated_at = now()`;

  await logAudit(userId, "mushaf.progress_set", "student", studentId, { surah, ayah });
  revalidatePath(`/teacher/students/${studentId}/mushaf`);
  return { success: "تم حفظ آخر موضع." };
}

/** المعلم يضيف خطأ مصحف جديد. */
export async function addMushafMistake(_prev: MushafState, formData: FormData): Promise<MushafState> {
  const studentId = formData.get("student_id") as string;
  let teacherId: string, userId: string;
  try {
    ({ teacherId, userId } = await teacherForStudent(studentId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "خطأ" };
  }

  const { surah, ayah, word } = parseLocation(formData);
  const type = String(formData.get("mistake_type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = (String(formData.get("note") ?? "").trim()) || null;
  let classId = (formData.get("class_id") as string) || null;

  if (!Number.isInteger(surah) || surah < 1 || surah > 114) return { error: "سورة غير صالحة" };
  if (!Number.isInteger(ayah) || ayah < 1) return { error: "آية غير صالحة" };
  if (!isMistakeType(type)) return { error: "نوع خطأ غير صالح" };
  if (!title || title.length > 200) return { error: "العنوان مطلوب (٢٠٠ حرف كحد أقصى)" };
  if (note && note.length > 2000) return { error: "الملاحظة طويلة جداً" };

  // تحقّق أن الحصة (إن وُجدت) تخصّ هذا الطالب وهذا المعلم، وإلا تجاهل الربط
  if (classId) {
    const [ok] = await sql<{ id: string }[]>`
      select id from classes where id = ${classId} and student_id = ${studentId} and teacher_id = ${teacherId} limit 1`;
    if (!ok) classId = null;
  }

  const page = await pageFor(surah, ayah);

  await sql`
    insert into student_mushaf_mistakes
      (student_id, teacher_id, class_id, surah_number, ayah_number, word_index, page_number, mistake_type, title, note)
    values (${studentId}, ${teacherId}, ${classId}, ${surah}, ${ayah}, ${word}, ${page}, ${type}, ${title}, ${note})`;

  await logAudit(userId, "mushaf.mistake_add", "student", studentId, { surah, ayah, type });

  // إشعار الطالب بالملاحظة غير المتزامنة فقط (أثناء الحصة المباشرة يراها لحظياً، فلا نُغرقه)
  if (!classId) {
    await notifyStudent(studentId, "ملاحظة جديدة على مصحفك 📖", `سجّل معلمك: ${title}`);
  }

  revalidatePath(`/teacher/students/${studentId}/mushaf`);
  return { success: "تمت إضافة الخطأ." };
}

/** المعلم يعدّل خطأً قائماً. */
export async function updateMushafMistake(_prev: MushafState, formData: FormData): Promise<MushafState> {
  const mistakeId = formData.get("mistake_id") as string;
  let studentId: string, userId: string;
  try {
    ({ studentId, userId } = await teacherForMistake(mistakeId));
  } catch (e) {
    return { error: e instanceof Error ? e.message : "خطأ" };
  }

  const type = String(formData.get("mistake_type") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const note = (String(formData.get("note") ?? "").trim()) || null;
  if (!isMistakeType(type)) return { error: "نوع خطأ غير صالح" };
  if (!title || title.length > 200) return { error: "العنوان مطلوب (٢٠٠ حرف كحد أقصى)" };
  if (note && note.length > 2000) return { error: "الملاحظة طويلة جداً" };

  await sql`
    update student_mushaf_mistakes set mistake_type = ${type}, title = ${title}, note = ${note}
    where id = ${mistakeId}`;
  await logAudit(userId, "mushaf.mistake_update", "mistake", mistakeId, null);
  revalidatePath(`/teacher/students/${studentId}/mushaf`);
  return { success: "تم تحديث الخطأ." };
}

/** تبديل حالة "تم حلّه" للخطأ. */
export async function toggleMushafMistakeResolved(formData: FormData) {
  const mistakeId = formData.get("mistake_id") as string;
  const { studentId, userId } = await teacherForMistake(mistakeId);
  await sql`update student_mushaf_mistakes set is_resolved = not is_resolved where id = ${mistakeId}`;
  await logAudit(userId, "mushaf.mistake_toggle", "mistake", mistakeId, null);
  revalidatePath(`/teacher/students/${studentId}/mushaf`);
}

/** حذف خطأ. */
export async function deleteMushafMistake(formData: FormData) {
  const mistakeId = formData.get("mistake_id") as string;
  const { studentId, userId } = await teacherForMistake(mistakeId);
  await sql`delete from student_mushaf_mistakes where id = ${mistakeId}`;
  await logAudit(userId, "mushaf.mistake_delete", "mistake", mistakeId, null);
  revalidatePath(`/teacher/students/${studentId}/mushaf`);
}
