import { sql } from "@/lib/db";
import { StudentRegisterForm } from "@/components/auth/student-register-form";

type Pkg = { id: string; name: string; price: number; currency: string };

export default async function StudentRegisterPage() {
  const packages = await sql<Pkg[]>`
    select id, name, price, currency from packages where is_active = true order by price`;

  return <StudentRegisterForm packages={packages} />;
}
