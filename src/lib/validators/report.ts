import { z } from "zod";

const score = z.coerce.number().int().min(0).max(100);

export const reportSchema = z.object({
  class_id: z.string().uuid(),
  attended: z.preprocess((v) => v === "true" || v === true, z.boolean()),
  lesson_type: z.enum(["memorization", "revision", "tajweed", "test"]),
  surah_name: z.string().optional().or(z.literal("")),
  ayah_from: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1).optional()),
  ayah_to: z.preprocess((v) => (v === "" || v == null ? undefined : v), z.coerce.number().int().min(1).optional()),
  memorization_score: score,
  tajweed_score: score,
  fluency_score: score,
  commitment_score: score,
  teacher_notes: z.string().optional().or(z.literal("")),
  homework: z.string().optional().or(z.literal("")),
});

export const mistakeSchema = z.object({
  category: z.enum(["memorization", "tajweed", "pronunciation"]),
  type: z.string().min(1),
  surah_name: z.string().optional().nullable(),
  ayah_number: z.number().int().nullable().optional(),
  severity: z.enum(["low", "medium", "high"]),
  description: z.string().optional().nullable(),
});

export const mistakesArraySchema = z.array(mistakeSchema).max(20);

/** التقييم العام الموزون: حفظ 40٪ تجويد 30٪ طلاقة 20٪ التزام 10٪. */
export function computeOverall(m: number, t: number, f: number, c: number) {
  return Math.round(m * 0.4 + t * 0.3 + f * 0.2 + c * 0.1);
}
