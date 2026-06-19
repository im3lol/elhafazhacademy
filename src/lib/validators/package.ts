import { z } from "zod";

const emptyToUndefined = (v: unknown) => (v === "" || v == null ? undefined : v);
const optionalNum = (min: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().min(min).optional());
const optionalInt = (min: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().min(min).optional());

export const packageSchema = z.object({
  name: z.string().min(2, "اسم الباقة مطلوب"),
  description: z.string().optional().or(z.literal("")),
  classes_per_month: optionalInt(0),
  hours_per_month: optionalNum(0),
  price: z.coerce.number().min(0, "السعر غير صالح"),
  currency: z.string().default("EGP"),
  duration_days: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1).default(30)),
  type: z.string().optional().or(z.literal("")),
  is_active: z.preprocess((v) => v === "true" || v === "on" || v === true, z.boolean()).default(true),
});

export type PackageInput = z.infer<typeof packageSchema>;
