"use client";

import { useActionState, useState } from "react";
import { createComplaint, type ComplaintState } from "@/lib/complaints/actions";
import { categoryLabel } from "@/lib/complaints/config";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewComplaint({ categories }: { categories: string[] }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState<ComplaintState, FormData>(createComplaint, {});
  const e = state.fieldErrors ?? {};

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button size="sm" onClick={() => setOpen(true)}>+ تذكرة جديدة</Button>
      </div>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 font-display text-lg font-bold">تذكرة جديدة</h3>
      <form action={formAction} className="space-y-4">
        {state.error && <FormMessage>{state.error}</FormMessage>}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="النوع" htmlFor="category">
            <Select id="category" name="category" defaultValue={categories[0]}>
              {categories.map((c) => (
                <option key={c} value={c}>{categoryLabel[c] ?? c}</option>
              ))}
            </Select>
          </Field>
          <Field label="الأولوية" htmlFor="priority">
            <Select id="priority" name="priority" defaultValue="medium">
              <option value="low">منخفضة</option>
              <option value="medium">متوسطة</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </Select>
          </Field>
        </div>

        <Field label="العنوان" htmlFor="subject" error={e.subject} required>
          <Input id="subject" name="subject" placeholder="عنوان مختصر للمشكلة" />
        </Field>

        <Field label="التفاصيل" htmlFor="description" error={e.description} required>
          <Textarea id="description" name="description" placeholder="اشرح المشكلة بالتفصيل…" />
        </Field>

        <div className="flex gap-2">
          <SubmitButton size="sm" pendingText="جارٍ الإرسال…">إرسال التذكرة</SubmitButton>
          <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>إلغاء</Button>
        </div>
      </form>
    </Card>
  );
}
