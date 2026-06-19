"use client";

import { useActionState, useState } from "react";
import {
  updateMushafMistake,
  toggleMushafMistakeResolved,
  deleteMushafMistake,
  type MushafState,
} from "@/lib/mushaf/actions";
import { MISTAKE_TYPES, MISTAKE_TYPE_KEYS, type MushafMistake } from "@/lib/mushaf/data";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";

type SurahOpt = { number: number; name_ar: string };

const toAr = (n: number) => n.toLocaleString("ar-EG");

function MistakeRow({ m, surahs }: { m: MushafMistake; surahs: SurahOpt[] }) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState<MushafState, FormData>(updateMushafMistake, {});
  const meta = MISTAKE_TYPES[m.mistake_type];
  const surahName = surahs.find((s) => s.number === m.surah_number)?.name_ar ?? `سورة ${m.surah_number}`;

  return (
    <Card className={`space-y-2 ${m.is_resolved ? "opacity-60" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-block h-2.5 w-2.5 rounded-full ${meta.dot}`} />
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.soft}`}>{meta.label}</span>
          <span className="text-sm text-muted">
            {surahName} · آية {toAr(m.ayah_number)}{m.word_index != null ? ` · كلمة ${toAr(m.word_index)}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing((v) => !v)}>
            {editing ? "إلغاء" : "تعديل"}
          </Button>
          <form action={toggleMushafMistakeResolved}>
            <input type="hidden" name="mistake_id" value={m.id} />
            <Button type="submit" size="sm" variant="ghost">{m.is_resolved ? "إرجاع" : "تم حلّه"}</Button>
          </form>
          <form action={deleteMushafMistake}>
            <input type="hidden" name="mistake_id" value={m.id} />
            <Button type="submit" size="sm" variant="ghost" className="text-danger">حذف</Button>
          </form>
        </div>
      </div>

      {!editing ? (
        <div>
          <p className="font-medium">{m.title}</p>
          {m.note && <p className="text-sm text-muted">{m.note}</p>}
        </div>
      ) : (
        <form action={action} className="space-y-2 border-t border-border pt-2">
          <input type="hidden" name="mistake_id" value={m.id} />
          <div className="grid gap-2 sm:grid-cols-2">
            <Select name="mistake_type" defaultValue={m.mistake_type}>
              {MISTAKE_TYPE_KEYS.map((k) => (
                <option key={k} value={k}>{MISTAKE_TYPES[k].label}</option>
              ))}
            </Select>
            <Input name="title" defaultValue={m.title} placeholder="عنوان الخطأ" required />
          </div>
          <Textarea name="note" defaultValue={m.note ?? ""} placeholder="ملاحظة للطالب (اختياري)" />
          {state.error && <p className="rounded-lg bg-danger/15 px-3 py-2 text-sm text-danger">{state.error}</p>}
          {state.success && <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">{state.success}</p>}
          <Button type="submit" size="sm" disabled={pending}>{pending ? "حفظ…" : "حفظ التعديل"}</Button>
        </form>
      )}
    </Card>
  );
}

/** قائمة الأخطاء المسجّلة (تعديل/حل/حذف). الإضافة وتعيين الموضع تتمّان بصرياً عبر MushafPicker. */
export function MushafMistakesList({ surahs, mistakes }: { surahs: SurahOpt[]; mistakes: MushafMistake[] }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-xl font-bold">
        الأخطاء المسجّلة {mistakes.length > 0 && <span className="text-muted">({toAr(mistakes.length)})</span>}
      </h2>
      {mistakes.length === 0 ? (
        <Card className="text-sm text-muted">لا أخطاء مسجّلة بعد — حدّد موضعاً في المصحف أعلاه وأضِف ملاحظة.</Card>
      ) : (
        <div className="space-y-3">
          {mistakes.map((m) => (
            <MistakeRow key={m.id} m={m} surahs={surahs} />
          ))}
        </div>
      )}
    </div>
  );
}
