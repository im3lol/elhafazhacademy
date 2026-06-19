"use client";

import { useActionState, useState } from "react";
import { createPackageRequest, type RequestState } from "@/lib/package-requests/actions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

type Pkg = { id: string; name: string; price: string; currency: string };

export function PackageRequestForm({ packages }: { packages: Pkg[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<RequestState, FormData>(createPackageRequest, {});
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>+ طلب تغيير الباقة</Button>
      </div>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold">طلب تغيير الباقة</h3>
      <form action={formAction} className="space-y-4">
        {state.error && <FormMessage>{state.error}</FormMessage>}

        <Field label="الباقة المطلوبة" htmlFor="requested_package_id" error={e.requested_package_id} required>
          <Select id="requested_package_id" name="requested_package_id" defaultValue="">
            <option value="" disabled>اختر باقة…</option>
            {packages.map((p) => (
              <option key={p.id} value={p.id}>{p.name} — {Number(p.price).toLocaleString("ar-EG")} {p.currency}</option>
            ))}
          </Select>
        </Field>

        <Field label="سبب الطلب" htmlFor="reason" error={e.reason} required>
          <Textarea id="reason" name="reason" placeholder="لماذا ترغب في تغيير باقتك؟" />
        </Field>

        <div className="flex gap-2">
          <SubmitButton size="sm" pendingText="جارٍ الإرسال…">إرسال الطلب</SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
        </div>
      </form>
    </Card>
  );
}
