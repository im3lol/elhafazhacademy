"use client";

import { useEffect, useRef, useState } from "react";
import type { PageWord, SurahHeader } from "@/lib/mushaf/data";

export type PageData = { juz: number | null; words: PageWord[]; surahHeaders: SurahHeader[] };

const EMPTY: PageData = { juz: null, words: [], surahHeaders: [] };

/**
 * يجلب بيانات صفحة المصحف من /api/quran/page/[n] مع كاش بسيط في الذاكرة لكل عارض.
 * يُرجع `error` صريحاً: بدونه كان انتهاء الجلسة (٤٠١) يظهر كصفحة فارغة بلا سبب.
 */
export function usePageData(page: number): { data: PageData; loading: boolean; error: string | null } {
  const [data, setData] = useState<PageData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cacheRef = useRef<Record<number, PageData>>({});

  useEffect(() => {
    let active = true;
    const cached = cacheRef.current[page];
    if (cached) {
      setData(cached);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`/api/quran/page/${page}`)
      .then(async (r) => {
        if (r.status === 401) throw new Error("انتهت جلستك. أعد تسجيل الدخول لعرض المصحف.");
        if (!r.ok) throw new Error("تعذّر تحميل الصفحة. تحقّق من اتصالك وحاول مجدداً.");
        return (await r.json()) as PageData;
      })
      .then((d) => {
        if (!active) return;
        const pd = { juz: d.juz, words: d.words ?? [], surahHeaders: d.surahHeaders ?? [] };
        cacheRef.current[page] = pd;
        setData(pd);
        setError(null);
      })
      .catch((e: Error) => {
        if (!active) return;
        setData(EMPTY);
        setError(e.message || "تعذّر تحميل الصفحة.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [page]);

  return { data, loading, error };
}
