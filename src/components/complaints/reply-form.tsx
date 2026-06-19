"use client";

import { useRef } from "react";
import { addMessage } from "@/lib/complaints/actions";
import { Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export function ReplyForm({ complaintId }: { complaintId: string }) {
  const ref = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        await addMessage(fd);
        ref.current?.reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="complaint_id" value={complaintId} />
      <Textarea name="message" placeholder="اكتب ردّك…" required />
      <div className="flex justify-end">
        <SubmitButton size="sm" pendingText="جارٍ الإرسال…">إرسال الرد</SubmitButton>
      </div>
    </form>
  );
}
