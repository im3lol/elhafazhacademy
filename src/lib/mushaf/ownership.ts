// استعلامات التحقق من ملكية المعلم لبيانات المصحف — مفصولة لتكون قابلة للاختبار.
// (لا تعتمد على الجلسة؛ تأخذ userId صراحةً وتقبل sql أو tx.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Executor = any;

/** يُرجع معرّف المعلم إن كان المستخدم معلّماً يملك هذا الطالب، وإلا null. */
export async function teacherIdOwningStudent(
  db: Executor,
  studentId: string,
  userId: string,
): Promise<string | null> {
  const [row] = await db`
    select t.id from teachers t
    join students s on s.teacher_id = t.id
    where s.id = ${studentId} and t.user_id = ${userId} limit 1`;
  return row?.id ?? null;
}

/** يُرجع student_id/teacher_id إن كان الخطأ يخصّ طالباً يملكه المستخدم (معلّمه)، وإلا null. */
export async function ownerOfMushafMistake(
  db: Executor,
  mistakeId: string,
  userId: string,
): Promise<{ studentId: string; teacherId: string } | null> {
  const [row] = await db`
    select m.student_id, t.id as teacher_id
    from student_mushaf_mistakes m
    join students s on s.id = m.student_id
    join teachers t on t.id = s.teacher_id
    where m.id = ${mistakeId} and t.user_id = ${userId} limit 1`;
  return row ? { studentId: row.student_id, teacherId: row.teacher_id } : null;
}
