import { sql } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { requestStudent, cancelStudentRequest } from "@/lib/student-requests/actions";

type Row = {
  id: string;
  full_name: string;
  country: string | null;
  current_level: string | null;
  package_name: string | null;
  request_id: string | null; // طلب معلّق من هذا المعلم
};

export default async function TeacherNewStudentsPage() {
  const user = await getSessionUser();
  const [teacher] = await sql<{ id: string }[]>`select id from teachers where user_id = ${user!.id} limit 1`;

  const students = teacher
    ? await sql<Row[]>`
        select s.id, s.full_name, s.country, s.current_level, p.name as package_name,
               (select r.id from student_teacher_requests r
                where r.student_id = s.id and r.teacher_id = ${teacher.id} and r.status = 'pending' limit 1) as request_id
        from students s
        left join packages p on p.id = s.package_id
        where s.status = 'Active' and s.teacher_id is null
        order by s.created_at desc`
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-black">طلاب جدد</h1>
        <p className="mt-1 text-muted">اطلب استقبال طلاب بلا معلم، وتوافق الإدارة على التعيين.</p>
      </div>

      {students.length === 0 ? (
        <Card className="text-sm text-muted">لا يوجد طلاب بلا معلم حالياً.</Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[640px] text-right text-sm">
            <thead className="border-b border-border text-xs text-muted">
              <tr>
                <th className="p-3 font-medium">الاسم</th>
                <th className="p-3 font-medium">الدولة</th>
                <th className="p-3 font-medium">المستوى</th>
                <th className="p-3 font-medium">الباقة</th>
                <th className="p-3 font-medium">الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id} className="border-b border-border/60 last:border-0">
                  <td className="p-3 font-medium">{s.full_name}</td>
                  <td className="p-3 text-muted">{s.country ?? "—"}</td>
                  <td className="p-3 text-muted">{s.current_level ?? "—"}</td>
                  <td className="p-3 text-muted">{s.package_name ?? "—"}</td>
                  <td className="p-3">
                    {s.request_id ? (
                      <form action={cancelStudentRequest} className="flex items-center gap-2">
                        <input type="hidden" name="request_id" value={s.request_id} />
                        <span className="text-xs text-warning">قيد المراجعة</span>
                        <Button type="submit" variant="ghost" size="sm">إلغاء</Button>
                      </form>
                    ) : (
                      <form action={requestStudent}>
                        <input type="hidden" name="student_id" value={s.id} />
                        <Button type="submit" size="sm">طلب الإضافة</Button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
