"use server";

import { revalidatePath } from "next/cache";
import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { saveBuffer } from "@/lib/storage";
import { sniffMime, EXT_FOR_MIME } from "@/lib/files/sniff";

export type PaymentState = { error?: string; success?: string };

const ALLOWED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_REFERENCE = 120;

/** رفع إثبات الدفع وإنشاء سجل الدفع. */
export async function uploadPaymentProof(
  _prev: PaymentState,
  formData: FormData,
): Promise<PaymentState> {
  const file = formData.get("proof") as File | null;
  const reference = (formData.get("reference") as string | null)?.trim() || null;

  if (!file || file.size === 0) return { error: "يرجى اختيار ملف إثبات الدفع" };
  if (!ALLOWED.includes(file.type)) return { error: "صيغة غير مدعومة (JPG, PNG, WEBP, PDF فقط)" };
  if (file.size > MAX_SIZE) return { error: "حجم الملف أكبر من ٥ ميجابايت" };
  if (reference && reference.length > MAX_REFERENCE) return { error: "المرجع طويل جداً" };

  // التحقق من المحتوى الفعلي (magic bytes) لا من النوع المُعلَن (القابل للتزوير)
  const buffer = Buffer.from(await file.arrayBuffer());
  const realMime = sniffMime(buffer);
  if (!realMime || !ALLOWED.includes(realMime)) {
    return { error: "محتوى الملف لا يطابق صيغة صورة/PDF صالحة" };
  }

  const user = await getSessionUser();
  if (!user) return { error: "انتهت الجلسة، يرجى تسجيل الدخول" };

  const [student] = await sql<{ id: string; package_id: string | null }[]>`
    select id, package_id from students where user_id = ${user.id} limit 1`;
  if (!student) return { error: "لم يُعثر على ملف الطالب" };

  // مبلغ الباقة إن وُجدت
  let amount = 0;
  if (student.package_id) {
    const [pkg] = await sql<{ price: number }[]>`
      select price from packages where id = ${student.package_id} limit 1`;
    amount = pkg?.price ?? 0;
  }

  // حفظ الملف على القرص بامتداد مشتقّ من النوع المكتشَف فعلاً
  let storedPath: string;
  try {
    storedPath = await saveBuffer("payment-proofs", user.id, buffer, EXT_FOR_MIME[realMime]);
  } catch {
    return { error: "تعذّر رفع الملف" };
  }

  await sql.begin(async (tx) => {
    await tx`
      insert into payments (student_id, amount, currency, payment_method, transaction_reference, proof_image_url, status)
      values (${student.id}, ${amount}, 'EGP', 'manual_transfer', ${reference}, ${storedPath}, 'Payment Under Review')`;
    await tx`update students set status = 'Payment Under Review' where id = ${student.id}`;
  });

  revalidatePath("/student/payment");
  revalidatePath("/student/dashboard");
  return { success: "تم رفع إثبات الدفع بنجاح. حسابك قيد المراجعة الآن." };
}
