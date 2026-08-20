import { sql } from "@/lib/db";
import { isUuid } from "@/lib/utils";

/**
 * مقطع المسار → معرّف الطالب (uuid).
 *
 * المسارات صارت تحمل الرقم المتسلسل (`/admin/students/1001`) بدل مقطع uuid
 * لا يُقرأ ولا يُملى على الهاتف. الـ uuid يبقى مقبولاً كذلك كي لا تنكسر روابط
 * أو علامات مرجعية أُنشئت قبل هذا التغيير.
 *
 * لا يفحص هذا الدالّ الصلاحية — الصفحة تفعل ذلك بعده كما كانت (حارس الأدمن،
 * أو teacherIdOwningStudent للمعلم).
 */
export async function studentIdFromParam(param: string): Promise<string | null> {
  if (isUuid(param)) return param;
  if (!/^[0-9]{1,9}$/.test(param)) return null;
  const [row] = await sql<{ id: string }[]>`
    select id from students where code = ${Number(param)} limit 1`;
  return row?.id ?? null;
}
