"use client";

import { useEffect, useRef, useState } from "react";
import type { PageWord, SurahHeader } from "@/lib/mushaf/data";

export type PageData = { juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };

/** يجلب بيانات صفحة المصحف من /api/quran/page/[n] مع كاش بسيط في الذاكرة لكل عارض. */
export function usePageData(page: number): { data: PageData; loading: boolean } {
  const [data, setData] = useState<PageData>({ juz: null, words: [], surahHeaders: [] });
  const [loading, setLoading] = useState(true);
  const cacheRef = useRef<Record<number, PageData>>({});

  useEffect(() => {
    let active = true;
    const cached = cacheRef.current[page];
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/quran/page/${page}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: PageData) => {
        if (!active) return;
        const pd = { juz: d.juz, words: d.words ?? [], surahHeaders: d.surahHeaders ?? [] };
        cacheRef.current[page] = pd;
        setData(pd);
      })
      .catch(() => active && setData({ juz: null, words: [], surahHeaders: [] }))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  return { data, loading };
}
