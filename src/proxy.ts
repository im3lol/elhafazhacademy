import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Proxy (بديل Middleware في Next.js 16): يضيف رؤوس أمان لكل الاستجابات.
 */
export function proxy(_request: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "geolocation=(), camera=(), microphone=()");
  res.headers.set("X-DNS-Prefetch-Control", "off");

  // CSP تحصينية غير كاسرة: تمنع حقن <base> وتضمين الإضافات والتأطير واختطاف النماذج،
  // دون تقييد script/style/media (تقييدها يحتاج بنية nonce — خطوة لاحقة).
  res.headers.set(
    "Content-Security-Policy",
    "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
  );

  // فرض HTTPS في الإنتاج فقط (سنة + النطاقات الفرعية)
  if (process.env.NODE_ENV === "production") {
    res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  return res;
}

export const config = {
  // كل المسارات عدا أصول Next الثابتة
  matcher: "/((?!_next/static|_next/image|favicon.ico).*)",
};
