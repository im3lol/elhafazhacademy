import { notFound } from "next/navigation";
import { getAccessibleComplaint } from "@/lib/complaints/actions";
import { getMessages } from "@/lib/complaints/queries";
import { ComplaintThread } from "@/components/complaints/complaint-thread";
import { isUuid } from "@/lib/utils";

export default async function TeacherComplaintDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const access = await getAccessibleComplaint(id);
  if (!access) notFound();
  const { complaint, user } = access;
  const messages = await getMessages(id, user.id);
  return (
    <div className="mx-auto max-w-3xl">
      <ComplaintThread
        complaint={{ ...complaint, creator_name: null }}
        messages={messages}
        isAdmin={false}
      />
    </div>
  );
}
