// منفّذ استعلامات postgres.js (sql أو tx — نفس الواجهة)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = any;

type ClassRate = {
  id: string;
  teacher_id: string;
  per_class_rate: string | null;
};

/**
 * يحتسب مستحق المعلم لحصة مكتملة (إن لم يوجد).
 * القاعدة: ربح الحصة = تكلفة الحصة المتفق عليها (per_class_rate).
 * لا يُنشأ مستحق إذا لم تُحدَّد تكلفة الحصة بعد (تُحدَّد عند اعتماد المعلم).
 * يقبل sql أو tx (نفس الواجهة).
 */
export async function ensureEarningForClass(db: Executor, classId: string) {
  const [c]: ClassRate[] = await db`
    select c.id, c.teacher_id, t.per_class_rate
    from classes c join teachers t on t.id = c.teacher_id
    where c.id = ${classId} and c.status = 'completed'
    limit 1`;
  if (!c) return;

  // لا تكلفة متفق عليها بعد → لا يُحتسب مستحق (يُحتسب لاحقاً عند تحديدها)
  if (c.per_class_rate == null) return;
  const amount = Number(c.per_class_rate);

  await db`
    insert into teacher_earnings (teacher_id, class_id, amount, currency, status)
    values (${c.teacher_id}, ${c.id}, ${amount}, 'EGP', 'pending')
    on conflict (class_id) do nothing`;
}
