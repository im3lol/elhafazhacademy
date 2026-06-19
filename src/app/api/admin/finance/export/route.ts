import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { hasPermission } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

type Row = { full_name: string; pending: string; approved: string; paid: string };

/** يصدّر أرصدة مستحقات المعلمين كملف CSV (UTF-8 BOM لدعم العربية). */
export async function GET() {
  const u = await getSessionUser();
  if (!u || u.userType !== "admin" || !(await hasPermission(u.id, "finance.view"))) {
    return new Response("forbidden", { status: 403 });
  }

  const rows = await sql<Row[]>`
    select t.full_name,
      coalesce(sum(amount) filter (where e.status = 'pending'), 0) as pending,
      coalesce(sum(amount) filter (where e.status = 'approved'), 0) as approved,
      coalesce(sum(amount) filter (where e.status = 'paid'), 0) as paid
    from teachers t
    join teacher_earnings e on e.teacher_id = t.id
    group by t.full_name
    order by t.full_name`;

  const esc = (v: string) => `"${String(v).replace(/"/g, '""')}"`;
  const header = ["المعلم", "معلّق", "معتمد", "مدفوع"].join(",");
  const lines = rows.map((r) =>
    [esc(r.full_name), Number(r.pending), Number(r.approved), Number(r.paid)].join(","),
  );
  const csv = "﻿" + [header, ...lines].join("\r\n");

  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="teacher-earnings.csv"`,
    },
  });
}
