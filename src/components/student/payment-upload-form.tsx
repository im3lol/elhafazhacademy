"use client";

import { useActionState } from "react";
import { uploadPaymentProof, type PaymentState } from "@/lib/auth/payment-actions";
import { Input } from "@/components/ui/input";
import { Field, FormMessage } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";

export function PaymentUploadForm() {
  const [state, formAction] = useActionState<PaymentState, FormData>(
    uploadPaymentProof,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error && <FormMessage>{state.error}</FormMessage>}
      {state.success && <FormMessage type="success">{state.success}</FormMessage>}

      <Field label="رقم/مرجع التحويل" htmlFor="reference" hint="اختياري — يسهّل المطابقة">
        <Input id="reference" name="reference" dir="ltr" placeholder="TXN-123456" />
      </Field>

      <Field label="صورة إثبات التحويل" htmlFor="proof" hint="JPG أو PNG أو PDF — حتى ٥ ميجابايت" required>
        <Input
          id="proof"
          name="proof"
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          className="file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-4 file:py-1.5 file:text-brand-foreground file:font-medium pt-2.5"
        />
      </Field>

      <SubmitButton size="lg" pendingText="جارٍ الرفع…">
        رفع الإثبات
      </SubmitButton>
    </form>
  );
}
