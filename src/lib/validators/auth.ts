import { z } from "zod";

const phoneRegex = /^\+?[0-9\s-]{8,15}$/;

/** يحوّل القيم الفارغة إلى undefined قبل التحقق (للحقول الرقمية الاختيارية). */
const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);

/** رقم صحيح اختياري ضمن مدى. */
const optionalInt = (min: number, max: number, msg?: string) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min, msg).max(max).optional());

/** قيمة منطقية من نص "true"/"false". */
const boolFromString = z.preprocess((v) => v === "true" || v === true, z.boolean());

export const loginSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(6, "كلمة المرور ٦ أحرف على الأقل"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const studentRegisterSchema = z.object({
  full_name: z.string().min(3, "الاسم الكامل مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  phone: z.string().regex(phoneRegex, "رقم هاتف غير صالح"),
  whatsapp: z.string().regex(phoneRegex, "رقم واتساب غير صالح").optional().or(z.literal("")),
  country: z.string().min(2, "الدولة مطلوبة"),
  city: z.string().optional().or(z.literal("")),
  age: optionalInt(4, 100, "العمر غير صالح"),
  gender: z.enum(["male", "female"], { message: "اختر الجنس" }),
  current_level: z.string().min(1, "اختر مستوى الحفظ"),
  has_tajweed_experience: boolFromString.optional(),
  package_id: z.string().uuid("اختر باقة").optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور ٦ أحرف على الأقل"),
});
export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;

export const teacherRegisterSchema = z.object({
  full_name: z.string().min(3, "الاسم الكامل مطلوب"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  phone: z.string().regex(phoneRegex, "رقم هاتف غير صالح"),
  whatsapp: z.string().regex(phoneRegex, "رقم واتساب غير صالح").optional().or(z.literal("")),
  country: z.string().min(2, "الدولة مطلوبة"),
  city: z.string().optional().or(z.literal("")),
  qualifications: z.string().min(3, "المؤهلات مطلوبة"),
  experience_years: optionalInt(0, 60),
  ijazat: z.string().optional().or(z.literal("")),
  bio: z.string().optional().or(z.literal("")),
  password: z.string().min(6, "كلمة المرور ٦ أحرف على الأقل"),
});
export type TeacherRegisterInput = z.infer<typeof teacherRegisterSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
});
