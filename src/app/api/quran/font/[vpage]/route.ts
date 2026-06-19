export const dynamic = "force-dynamic";

/**
 * وكيل خطوط QCF v2: يجلب ملف الخط من quran.com ويقدّمه من نفس النطاق
 * (لتفادي حجب CORS على الخطوط عبر النطاقات). يُخزَّن طويلاً (الخطوط ثابتة).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ vpage: string }> }) {
  const vp = Number((await params).vpage);
  if (!Number.isInteger(vp) || vp < 1 || vp > 604) {
    return new Response("not found", { status: 404 });
  }
  try {
    const res = await fetch(`https://quran.com/fonts/quran/hafs/v2/woff2/p${vp}.woff2`);
    if (!res.ok) return new Response("upstream error", { status: 502 });
    const buf = await res.arrayBuffer();
    return new Response(buf, {
      headers: {
        "content-type": "font/woff2",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}
