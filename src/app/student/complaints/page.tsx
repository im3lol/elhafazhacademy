import { getSessionUser } from "@/lib/auth/session";
import { listComplaints } from "@/lib/complaints/queries";
import { studentCategories } from "@/lib/complaints/config";
import { NewComplaint } from "@/components/complaints/new-complaint";
import { ComplaintsList } from "@/components/complaints/complaints-list";

export default async function StudentComplaintsPage() {
  const user = await getSessionUser();
  const complaints = await listComplaints(user!);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الشكاوى والاقتراحات</h1>
        <p className="mt-1 text-muted">افتح تذكرة وتابع الردود من فريق الدعم.</p>
      </div>
      <NewComplaint categories={studentCategories} />
      <ComplaintsList complaints={complaints} basePath="/student" />
    </div>
  );
}
