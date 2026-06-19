"use client";

import { useActionState, useEffect, useState } from "react";
import {
  createPackage,
  updatePackage,
  togglePackage,
  deletePackage,
  type PackageState,
} from "@/lib/admin/package-actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export type Pkg = {
  id: string;
  name: string;
  description: string | null;
  classes_per_month: number | null;
  hours_per_month: number | null;
  price: number;
  currency: string;
  duration_days: number | null;
  type: string | null;
  is_active: boolean;
};

function toAr(n: number | string | null) {
  if (n == null) return "—";
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}

function PackageForm({
  initial,
  onDone,
}: {
  initial?: Pkg;
  onDone: () => void;
}) {
  const action = initial ? updatePackage : createPackage;
  const [state, formAction] = useActionState<PackageState, FormData>(action, {});
  const e = state.fieldErrors ?? {};

  useEffect(() => {
    if (state.success) onDone();
  }, [state.success, onDone]);

  return (
    <form action={formAction} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {state.error && <FormMessage>{state.error}</FormMessage>}

      <Field label="اسم الباقة" htmlFor="name" error={e.name} required>
        <Input id="name" name="name" defaultValue={initial?.name} placeholder="الباقة الأساسية" />
      </Field>

      <Field label="الوصف" htmlFor="description" error={e.description}>
        <Textarea id="description" name="description" defaultValue={initial?.description ?? ""} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="عدد الحصص شهرياً" htmlFor="classes_per_month" error={e.classes_per_month}>
          <Input id="classes_per_month" name="classes_per_month" type="number" min={0} dir="ltr"
            defaultValue={initial?.classes_per_month ?? ""} />
        </Field>
        <Field label="عدد الساعات شهرياً" htmlFor="hours_per_month" error={e.hours_per_month}>
          <Input id="hours_per_month" name="hours_per_month" type="number" min={0} dir="ltr"
            defaultValue={initial?.hours_per_month ?? ""} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Field label="السعر" htmlFor="price" error={e.price} required>
          <Input id="price" name="price" type="number" min={0} dir="ltr" defaultValue={initial?.price ?? ""} />
        </Field>
        <Field label="العملة" htmlFor="currency" error={e.currency}>
          <Input id="currency" name="currency" dir="ltr" defaultValue={initial?.currency ?? "EGP"} />
        </Field>
        <Field label="المدة (أيام)" htmlFor="duration_days" error={e.duration_days}>
          <Input id="duration_days" name="duration_days" type="number" min={1} dir="ltr"
            defaultValue={initial?.duration_days ?? 30} />
        </Field>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="is_active" value="true" defaultChecked={initial?.is_active ?? true}
          className="h-4 w-4 accent-[var(--brand)]" />
        باقة نشطة (تظهر للطلاب)
      </label>

      <div className="flex gap-2">
        <SubmitButton size="sm" pendingText="جارٍ الحفظ…">
          {initial ? "حفظ التعديلات" : "إضافة الباقة"}
        </SubmitButton>
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>إلغاء</Button>
      </div>
    </form>
  );
}

export function PackageManager({ packages }: { packages: Pkg[] }) {
  const [editing, setEditing] = useState<string | "new" | null>(null);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{packages.length} باقة</p>
        {editing !== "new" && (
          <Button size="sm" onClick={() => setEditing("new")}>+ باقة جديدة</Button>
        )}
      </div>

      {editing === "new" && (
        <Card>
          <h3 className="mb-4 font-display text-lg font-bold">باقة جديدة</h3>
          <PackageForm onDone={() => setEditing(null)} />
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        {packages.map((p) => (
          <Card key={p.id} className={p.is_active ? "" : "opacity-60"}>
            {editing === p.id ? (
              <>
                <h3 className="mb-4 font-display text-lg font-bold">تعديل: {p.name}</h3>
                <PackageForm initial={p} onDone={() => setEditing(null)} />
              </>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold">{p.name}</h3>
                    <p className="mt-1 text-sm text-muted">{p.description ?? "—"}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.is_active ? "bg-success/15 text-success" : "bg-muted/15 text-muted"}`}>
                    {p.is_active ? "نشطة" : "متوقفة"}
                  </span>
                </div>
                <div className="mt-4 flex items-end justify-between">
                  <div>
                    <span className="font-display text-2xl font-black text-brand">{toAr(p.price)}</span>{" "}
                    <span className="text-sm text-muted">{p.currency} / شهرياً</span>
                  </div>
                  <p className="text-sm text-muted">{toAr(p.classes_per_month)} حصة</p>
                </div>
                <div className="mt-4 flex gap-2 border-t border-border pt-3">
                  <Button size="sm" variant="outline" onClick={() => setEditing(p.id)}>تعديل</Button>
                  <form action={togglePackage}>
                    <input type="hidden" name="id" value={p.id} />
                    <Button size="sm" variant="ghost" type="submit">{p.is_active ? "إيقاف" : "تفعيل"}</Button>
                  </form>
                  <form action={deletePackage} className="ms-auto">
                    <input type="hidden" name="id" value={p.id} />
                    <Button size="sm" variant="danger" type="submit">حذف</Button>
                  </form>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
