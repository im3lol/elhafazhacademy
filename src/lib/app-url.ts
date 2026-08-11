/**
 * عنوان التطبيق الكامل — يُستخدم في روابط استرجاع كلمة المرور و OAuth.
 *
 * على Vercel يُشتق من `VERCEL_PROJECT_PRODUCTION_URL` (يضبطه Vercel تلقائياً)،
 * فلا يُسأل من ينشر نسخته عن رابطها قبل أن توجد. `NEXT_PUBLIC_APP_URL` يتقدّم
 * عليه عند وجود نطاق مخصّص.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL;
  if (explicit) return explicit.replace(/\/$/, "");

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${vercel}`;

  return "http://localhost:3000";
}
