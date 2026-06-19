import { getSessionUser } from "@/lib/auth/session";
import { listComplaints } from "@/lib/complaints/queries";
import { ComplaintsList } from "@/components/complaints/complaints-list";

export default async function AdminComplaintsPage() {
  const user = await getSessionUser();
  const complaints = await listComplaints(user!);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">إدارة الشكاوى</h1>
        <p className="mt-1 text-muted">راجع تذاكر الطلاب والمعلمين وردّ عليها.</p>
      </div>
      <ComplaintsList complaints={complaints} basePath="/admin" showCreator />
    </div>
  );
}
