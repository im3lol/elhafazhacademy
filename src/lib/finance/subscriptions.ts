// منفّذ استعلامات postgres.js (sql أو tx — نفس الواجهة)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = any;

/** حالات الحصص التي تحجز من رصيد الباقة وإن لم تُحتسب بعد (لم يُسجَّل تقريرها). */
const PENDING_STATUSES = ["scheduled", "meet_created", "meet_sent", "waiting", "live"];

export type ActiveSubscription = {
  id: string;
  total: number;
  used: number;
  pending: number;
  /** لا رصيد لحصة جديدة (المكتملة + المحجوزة بلغت سقف الباقة). */
  exhausted: boolean;
};

/**
 * الاشتراك النشط للطالب مع رصيده الحقيقي.
 * `classes_used` لا يزيد إلا عند تسجيل التقرير، فالاعتماد عليه وحده يسمح
 * بحجز عدد غير محدود من الحصص المستقبلية على باقة محدودة — لذلك تُحسب
 * الحصص المحجوزة غير المنتهية ضمن الرصيد.
 */
export async function activeSubscription(
  db: Executor,
  studentId: string,
): Promise<ActiveSubscription | null> {
  const [sub] = await db`
    select s.id, s.classes_total, s.classes_used,
      (select count(*) from classes c
        where c.subscription_id = s.id and c.status = any(${PENDING_STATUSES})) as pending
    from student_subscriptions s
    where s.student_id = ${studentId} and s.status = 'active'
    order by s.created_at desc limit 1`;
  if (!sub) return null;

  const total = Number(sub.classes_total ?? 0);
  const used = Number(sub.classes_used ?? 0);
  const pending = Number(sub.pending ?? 0);
  return { id: sub.id, total, used, pending, exhausted: total > 0 && used + pending >= total };
}

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
