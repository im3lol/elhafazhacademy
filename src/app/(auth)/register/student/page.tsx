import { getActivePackages } from "@/lib/packages";
import { StudentRegisterForm } from "@/components/auth/student-register-form";

type Pkg = { id: string; name: string; price: number; currency: string };

// تُولَّد عند الطلب (لا وقت البناء) لتفادي الاتصال بالقاعدة أثناء build.
export const dynamic = "force-dynamic";

export default async function StudentRegisterPage() {
  let packages: Pkg[] = [];
  try {
    packages = await getActivePackages();
  } catch {
    packages = [];
  }

  return <StudentRegisterForm packages={packages} />;
}
