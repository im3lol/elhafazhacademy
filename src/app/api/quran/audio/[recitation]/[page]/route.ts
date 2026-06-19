import { getSessionUser } from "@/lib/auth/session";
import { TOTAL_PAGES } from "@/lib/mushaf/data";

export const dynamic = "force-dynamic";

type AudioEntry = { url: string; segments: number[][] };

/**
 * صوت صفحة كاملة لقارئ مُحدّد من quran.com: لكل آية رابط MP3 + توقيتات الكلمات (segments).
 * يُستدعى من نفس النطاق (وكيل) لتفادي CORS، ويُخزَّن (التوقيتات ثابتة).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ recitation: string; page: string }> }) {
  const u = await getSessionUser();
  if (!u) return Response.json({ error: "unauthorized" }, { status: 401 });

  const { recitation, page } = await params;
  const rid = Number(recitation);
  const p = Number(page);
  if (!Number.isInteger(rid) || rid < 1 || !Number.isInteger(p) || p < 1 || p > TOTAL_PAGES) {
    return Response.json({ error: "invalid params" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://api.quran.com/api/v4/verses/by_page/${p}?audio=${rid}&per_page=300`);
    if (!res.ok) return Response.json({ error: "upstream" }, { status: 502 });
    const data = (await res.json()) as { verses?: { verse_key: string; audio?: { url?: string; segments?: number[][] } }[] };

    const audio: Record<string, AudioEntry> = {};
    for (const v of data.verses ?? []) {
      const a = v.audio;
      if (!a?.url) continue;
      let url = a.url;
      if (url.startsWith("//")) url = "https:" + url;
      else if (!url.startsWith("http")) url = "https://verses.quran.com/" + url;
      audio[v.verse_key] = { url, segments: a.segments ?? [] };
    }
    return Response.json(
      { audio },
      { headers: { "cache-control": "public, max-age=86400" } },
    );
  } catch {
    return Response.json({ error: "fetch failed" }, { status: 502 });
  }
}
