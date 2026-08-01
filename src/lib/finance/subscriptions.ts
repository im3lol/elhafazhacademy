// منفّذ استعلامات postgres.js (sql أو tx — نفس الواجهة)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = any;

/**
 * ينهي الاشتراكات التي انقضت مدّتها أو استُهلكت حصصها.
 * بدونه يبقى الاشتراك 'active' إلى الأبد، فيُحجب الطالب عن الحجز
 * ولا يُنشئ له الدفع الجديد اشتراكاً بديلاً (تُفحص وجود اشتراك نشط فقط).
 * يقبل sql أو tx، ويمكن قصره على طالب واحد. يُرجع عدد الاشتراكات المنتهية.
 */
export async function expireStaleSubscriptions(db: Executor, studentId?: string) {
  const rows = studentId
    ? await db`
        update student_subscriptions set status = 'expired'
        where status = 'active' and student_id = ${studentId}
          and (end_date < current_date or (classes_total > 0 and classes_used >= classes_total))
        returning id`
    : await db`
        update student_subscriptions set status = 'expired'
        where status = 'active'
          and (end_date < current_date or (classes_total > 0 and classes_used >= classes_total))
        returning id`;
  return rows.length;
}
