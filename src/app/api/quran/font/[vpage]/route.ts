export const dynamic = "force-dynamic";

/** ذاكرة محدودة للخطوط: أول زائر لكل صفحة يدفع ثمن الوكالة ومن بعده يُخدَم محلياً. */
const MAX_CACHED_FONTS = 40;
const fontCache = new Map<number, Buffer>();

function fontResponse(buf: Buffer) {
  return new Response(new Uint8Array(buf), {
    headers: {
      "content-type": "font/woff2",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}

/**
 * وكيل خطوط QCF v2: يجلب ملف الخط من quran.com ويقدّمه من نفس النطاق
 * (لتفادي حجب CORS على الخطوط عبر النطاقات). يُخزَّن طويلاً (الخطوط ثابتة).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ vpage: string }> }) {
  const vp = Number((await params).vpage);
  if (!Number.isInteger(vp) || vp < 1 || vp > 604) {
    return new Response("not found", { status: 404 });
  }

  const cached = fontCache.get(vp);
  if (cached) return fontResponse(cached);

  try {
    // مهلة صريحة: quran.com خدمة خارجية، وتعليقها كان يحبس الطلب بلا حدّ
    const res = await fetch(`https://quran.com/fonts/quran/hafs/v2/woff2/p${vp}.woff2`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return new Response("upstream error", { status: 502 });
    const buf = Buffer.from(await res.arrayBuffer());

    fontCache.set(vp, buf);
    if (fontCache.size > MAX_CACHED_FONTS) {
      const oldest = fontCache.keys().next().value;
      if (oldest !== undefined) fontCache.delete(oldest);
    }
    return fontResponse(buf);
  } catch {
    return new Response("fetch failed", { status: 502 });
  }
}
