import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { ReplyForm } from "@/components/complaints/reply-form";
import { setComplaintStatus, assignToMe } from "@/lib/complaints/actions";
import {
  categoryLabel, statusLabel, statusClass, priorityLabel, adminStatuses,
} from "@/lib/complaints/config";
import { formatClassTime } from "@/lib/class-status";

export type Msg = {
  id: string;
  message: string;
  created_at: string;
  sender_name: string | null;
  sender_type: string | null;
  is_mine: boolean;
};

export type ComplaintDetail = {
  id: string;
  category: string | null;
  subject: string | null;
  description: string | null;
  priority: string;
  status: string;
  created_at: string;
  creator_name: string | null;
  assigned_to: string | null;
};

export function ComplaintThread({
  complaint,
  messages,
  isAdmin,
}: {
  complaint: ComplaintDetail;
  messages: Msg[];
  isAdmin: boolean;
}) {
  const closed = complaint.status === "Closed";

  return (
    <div className="space-y-5">
      {/* الرأس */}
      <Card className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold">{complaint.subject}</h1>
            <p className="mt-1 text-sm text-muted">
              {categoryLabel[complaint.category ?? ""] ?? complaint.category}
              {" · "}أولوية {priorityLabel[complaint.priority] ?? complaint.priority}
              {isAdmin && complaint.creator_name ? ` · من ${complaint.creator_name}` : ""}
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass[complaint.status] ?? ""}`}>
            {statusLabel[complaint.status] ?? complaint.status}
          </span>
        </div>
        {complaint.description && (
          <p className="rounded-xl bg-surface p-3 text-sm leading-relaxed">{complaint.description}</p>
        )}

        {isAdmin && (
          <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <form action={setComplaintStatus} className="flex items-end gap-2">
              <input type="hidden" name="complaint_id" value={complaint.id} />
              <Select name="status" defaultValue={complaint.status} className="h-9 w-44">
                {adminStatuses.map((s) => (
                  <option key={s} value={s}>{statusLabel[s]}</option>
                ))}
              </Select>
              <Button type="submit" size="sm" variant="outline">تحديث الحالة</Button>
            </form>
            {!complaint.assigned_to && (
              <form action={assignToMe}>
                <input type="hidden" name="complaint_id" value={complaint.id} />
                <Button type="submit" size="sm" variant="ghost">إسناد لي</Button>
              </form>
            )}
          </div>
        )}
      </Card>

      {/* المحادثة */}
      <div className="space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-sm text-muted">لا ردود بعد.</p>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.is_mine ? "justify-start" : "justify-end"}`}>
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                m.is_mine ? "bg-brand text-brand-foreground" : "border border-border bg-surface"
              }`}
            >
              <p className="text-xs opacity-70">
                {m.sender_name ?? "—"}
                {m.sender_type === "admin" ? " (الدعم)" : ""}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{m.message}</p>
              <p className="mt-1 text-[10px] opacity-60" dir="rtl">{formatClassTime(m.created_at)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* الرد */}
      {closed ? (
        <Card className="text-center text-sm text-muted">هذه التذكرة مغلقة.</Card>
      ) : (
        <Card>
          <ReplyForm complaintId={complaint.id} />
        </Card>
      )}
    </div>
  );
}
