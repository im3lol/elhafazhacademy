"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { requirePermission } from "@/lib/auth/guards";
import { logAudit } from "@/lib/audit";
import { isUuid } from "@/lib/utils";

export type PersonFormState = { error?: string; success?: string };

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function isUniqueViolation(e: unknown) {
  return typeof e === "object" && e !== null && "code" in e && (e as { code: string }).code === "23505";
}

/** حقول مشتركة بين إنشاء المعلم والطالب. */
function readBase(formData: FormData) {
  return {
    fullName: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    password: String(formData.get("password") ?? ""),
    phone: String(formData.get("phone") ?? "").trim() || null,
    whatsapp: String(formData.get("whatsapp") ?? "").trim() || null,
    country: String(formData.get("country") ?? "").trim() || null,
  };
}

function validateBase(b: ReturnType<typeof readBase>): string | null {
  if (b.fullName.length < 2) return "الاسم مطلوب";
  if (b.fullName.length > 120) return "الاسم طويل جداً";
  if (!EMAIL_RE.test(b.email)) return "بريد إلكتروني غير صالح";
  if (b.password.length < 8) return "كلمة المرور يجب ألا تقل عن ٨ أحرف";
  return null;
}

/**
 * الأدمن ينشئ حساب معلم مباشرةً.
 * المعلم المُنشأ من الإدارة معتمَد فوراً (Active) — لا معنى لمراجعة حساب
 * أنشأته الإدارة بنفسها. تكلفة الحصة اختيارية وتُضبط لاحقاً من قائمة المعلمين،
 * ودونها لا يُحتسب له مستحق.
 */
export async function createTeacher(
  _prev: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const admin = await requirePermission("teachers.approve");
  const b = readBase(formData);
  const invalid = validateBase(b);
  if (invalid) return { error: invalid };

  const rateRaw = String(formData.get("per_class_rate") ?? "").trim();
  const rate = rateRaw ? Number(rateRaw) : null;
  if (rate !== null && (!Number.isFinite(rate) || rate <= 0)) {
    return { error: "تكلفة الحصة يجب أن تكون رقماً أكبر من صفر" };
  }

  const passwordHash = await hashPassword(b.password);
  let teacherId: string;
  try {
    teacherId = await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string }[]>`
        insert into users (email, password_hash, phone, whatsapp, user_type, status)
        values (${b.email}, ${passwordHash}, ${b.phone}, ${b.whatsapp}, 'teacher', 'active')
        returning id`;
      const [t] = await tx<{ id: string }[]>`
        insert into teachers (user_id, full_name, phone, whatsapp, country, status, per_class_rate)
        values (${user.id}, ${b.fullName}, ${b.phone}, ${b.whatsapp}, ${b.country}, 'Active', ${rate})
        returning id`;
      return t.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    return { error: "تعذّر إنشاء حساب المعلم" };
  }

  await logAudit(admin.id, "teacher.create", "teacher", teacherId, { email: b.email });
  revalidatePath("/admin/teachers");
  return { success: `تم إنشاء حساب المعلم ${b.fullName} وتفعيله.` };
}

/**
 * الأدمن ينشئ حساب طالب مباشرةً.
 * يُفعَّل فوراً (Active) لأن الإدارة استلمت الدفع خارج المنصة؛ ومع اختيار
 * باقة يُنشأ اشتراك نشط بسقف حصصها، وإلا فلا اشتراك ولا سقف.
 */
export async function createStudent(
  _prev: PersonFormState,
  formData: FormData,
): Promise<PersonFormState> {
  const admin = await requirePermission("students.create");
  const b = readBase(formData);
  const invalid = validateBase(b);
  if (invalid) return { error: invalid };

  const teacherId = String(formData.get("teacher_id") ?? "") || null;
  const packageId = String(formData.get("package_id") ?? "") || null;
  if (teacherId && !isUuid(teacherId)) return { error: "معلم غير صالح" };
  if (packageId && !isUuid(packageId)) return { error: "باقة غير صالحة" };

  const passwordHash = await hashPassword(b.password);
  let studentId: string;
  try {
    studentId = await sql.begin(async (tx) => {
      const [user] = await tx<{ id: string }[]>`
        insert into users (email, password_hash, phone, whatsapp, user_type, status)
        values (${b.email}, ${passwordHash}, ${b.phone}, ${b.whatsapp}, 'student', 'active')
        returning id`;
      const [s] = await tx<{ id: string }[]>`
        insert into students (user_id, full_name, phone, whatsapp, country, teacher_id, package_id, status)
        values (${user.id}, ${b.fullName}, ${b.phone}, ${b.whatsapp}, ${b.country},
                ${teacherId}, ${packageId}, 'Active')
        returning id`;

      if (packageId) {
        const [pkg] = await tx<{ classes_per_month: number | null; hours_per_month: number | null; duration_days: number | null }[]>`
          select classes_per_month, hours_per_month, duration_days from packages where id = ${packageId} limit 1`;
        await tx`
          insert into student_subscriptions (student_id, package_id, start_date, end_date, status, classes_total, hours_total)
          values (${s.id}, ${packageId}, current_date,
                  current_date + ${(pkg?.duration_days ?? 30)} * interval '1 day', 'active',
                  ${pkg?.classes_per_month ?? 0}, ${pkg?.hours_per_month ?? 0})
          on conflict (student_id) where status = 'active' do nothing`;
      }
      return s.id;
    });
  } catch (e) {
    if (isUniqueViolation(e)) return { error: "هذا البريد مسجّل بالفعل" };
    return { error: "تعذّر إنشاء حساب الطالب" };
  }

  await logAudit(admin.id, "student.create", "student", studentId, { email: b.email });
  revalidatePath("/admin/students");
  return { success: `تم إنشاء حساب الطالب ${b.fullName} وتفعيله.` };
}
