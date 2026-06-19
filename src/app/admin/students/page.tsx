import Link from "next/link";
import { sql } from "@/lib/db";
import { Card } from "@/components/ui/card";
import { Pagination, parsePage } from "@/components/ui/pagination";

const PAGE_SIZE = 20;

const statusLabel: Record<string, string> = {
  "Pending Payment": "بانتظار الدفع",
  "Payment Under Review": "مراجعة الدفع",
  Active: "نشط",
  Suspended: "موقوف",
  Cancelled: "ملغى",
  "Payment Rejected": "دفع مرفوض",
};

type Row = {
  id: string;
  full_name: string;
  country: string | null;
  current_level: string | null;
  status: string;
};

export default async function AdminStudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const page = parsePage((await searchParams).page);
  const offset = (page - 1) * PAGE_SIZE;
  const [students, [{ total }]] = await Promise.all([
    sql<Row[]>`
      select id, full_name, country, current_level, status
      from students order by created_at desc limit ${PAGE_SIZE} offset ${offset}`,
    sql<{ total: number }[]>`select count(*)::int as total from students`,
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">الطلاب</h1>
        <p className="mt-1 text-muted">{Number(total).toLocaleString("ar-EG")} طالب مسجّل.</p>
      </div>

      <Card className="overflow-x-auto p-0">
        <table className="w-full text-right text-sm">
          <thead className="border-b border-border text-muted">
            <tr>
              <th className="p-4 font-medium">الاسم</th>
              <th className="p-4 font-medium">الدولة</th>
              <th className="p-4 font-medium">المستوى</th>
              <th className="p-4 font-medium">الحالة</th>
            </tr>
          </thead>
          <tbody>
            {students.map((s) => (
              <tr key={s.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface/60">
                <td className="p-4 font-medium">
                  <Link href={`/admin/students/${s.id}`} className="hover:text-brand hover:underline">
                    {s.full_name}
                  </Link>
                </td>
                <td className="p-4 text-muted">{s.country ?? "—"}</td>
                <td className="p-4 text-muted">{s.current_level ?? "—"}</td>
                <td className="p-4">{statusLabel[s.status] ?? s.status}</td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted">لا يوجد طلاب بعد.</td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>

      <Pagination basePath="/admin/students" page={page} pageSize={PAGE_SIZE} total={Number(total)} />
    </div>
  );
}
