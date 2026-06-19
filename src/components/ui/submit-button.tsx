"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "./button";

/** زر إرسال يعرض حالة الإرسال تلقائياً داخل <form>. */
export function SubmitButton({
  children,
  pendingText = "جارٍ المعالجة…",
  ...props
}: ButtonProps & { pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? pendingText : children}
    </Button>
  );
}
