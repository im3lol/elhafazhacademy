import { getSessionUser } from "@/lib/auth/session";
import { listComplaints } from "@/lib/complaints/queries";
import { teacherCategories } from "@/lib/complaints/config";
import { NewComplaint } from "@/components/complaints/new-complaint";
import { ComplaintsList } from "@/components/complaints/complaints-list";

export default async function TeacherComplaintsPage() {
  const user = await getSessionUser();
  const complaints = await listComplaints(user!);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الشكاوى</h1>
        <p className="mt-1 text-muted">ارفع شكوى أو اقتراحاً للإدارة وتابع الردود.</p>
      </div>
      <NewComplaint categories={teacherCategories} />
      <ComplaintsList complaints={complaints} basePath="/teacher" />
    </div>
  );
}
