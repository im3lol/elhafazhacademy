import { z } from "zod";

export const classSchema = z.object({
  student_id: z.string().uuid("اختر الطالب"),
  teacher_id: z.string().uuid("اختر المعلم"),
  start_time: z.string().min(1, "اختر موعد الحصة"),
  duration_minutes: z.coerce.number().int().min(15).max(180).default(45),
  meet_link: z.string().url("رابط غير صالح").optional().or(z.literal("")),
});

export type ClassInput = z.infer<typeof classSchema>;
