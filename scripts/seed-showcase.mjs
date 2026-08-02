// بيانات عرض كاملة (ديمو) تُظهر المنصة وهي تعمل: معلمان وأربعة طلاب،
// حصص مكتملة بتقارير وتقييمات متدرّجة عبر ٦ أشهر، ملاحظات مصحف على كلمات،
// مدفوعات معتمَدة وأخرى بانتظار المراجعة، مستحقات، شكوى، وحصص قادمة.
//
// التشغيل:  node scripts/seed-showcase.mjs
// الحذف:    node scripts/seed-showcase.mjs --clean
//
// idempotent: يحذف بيانات العرض السابقة ثم يعيد بناءها، فلا تتراكم.
// كل الحسابات تحمل اللاحقة @demo.elhafazah — وهي مفتاح الحذف عند التسليم.
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const env = process.env.DATABASE_URL
  ? { DATABASE_URL: process.env.DATABASE_URL }
  : Object.fromEntries(
      readFileSync(new URL("../.env.local", import.meta.url), "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
        }),
    );

const sql = postgres(env.DATABASE_URL, {
  max: 1,
  prepare: !/pooler\.supabase\.com|:6543/.test(env.DATABASE_URL ?? ""),
});

const DOMAIN = "@demo.elhafazah";
const PASSWORD = "demo1234";

// ---------- الحذف ----------
// student_mushaf_progress/mistakes تشير إلى teachers بلا on delete cascade،
// فتُحذف صفوفها أولاً وإلا رفضت القاعدة حذف المعلم.
const demoLike = "%" + DOMAIN;
await sql`
  delete from student_mushaf_mistakes
  where teacher_id in (select t.id from teachers t join users u on u.id = t.user_id where u.email like ${demoLike})
     or student_id in (select s.id from students s join users u on u.id = s.user_id where u.email like ${demoLike})`;
await sql`
  delete from student_mushaf_progress
  where teacher_id in (select t.id from teachers t join users u on u.id = t.user_id where u.email like ${demoLike})
     or student_id in (select s.id from students s join users u on u.id = s.user_id where u.email like ${demoLike})`;
await sql`delete from users where email like ${demoLike}`;
if (process.argv.includes("--clean")) {
  console.log("🧹 حُذفت بيانات العرض.");
  await sql.end();
  process.exit(0);
}

const hash = await bcrypt.hash(PASSWORD, 10);

// ---------- الباقات ----------
const packages = await sql`select id, name, classes_per_month, price, duration_days from packages order by price`;
if (packages.length === 0) {
  console.error("لا توجد باقات. شغّل تهيئة القاعدة أولاً (db/init/02_seed.sql).");
  await sql.end();
  process.exit(1);
}
const pkgBasic = packages[0];
const pkgMid = packages[1] ?? packages[0];

// ---------- المعلمون ----------
const teacherSpecs = [
  {
    email: `m.abdulrahman${DOMAIN}`,
    name: "الشيخ عبدالرحمن السيد",
    country: "مصر",
    qual: "إجازة في القراءات العشر الصغرى",
    years: 12,
    rate: 90,
  },
  {
    email: `m.huda${DOMAIN}`,
    name: "الأستاذة هدى إبراهيم",
    country: "مصر",
    qual: "إجازة برواية حفص عن عاصم — بكالوريوس دراسات إسلامية",
    years: 7,
    rate: 75,
  },
];

const teachers = [];
for (const t of teacherSpecs) {
  const [u] = await sql`
    insert into users (email, password_hash, phone, user_type, status)
    values (${t.email}, ${hash}, '+201000000001', 'teacher', 'active') returning id`;
  const [row] = await sql`
    insert into teachers (user_id, full_name, phone, country, qualifications, experience_years, status, per_class_rate)
    values (${u.id}, ${t.name}, '+201000000001', ${t.country}, ${t.qual}, ${t.years}, 'Active', ${t.rate})
    returning id`;
  teachers.push({ ...t, id: row.id, userId: u.id });
}

// ---------- الطلاب ----------
// قصص مختلفة عمداً: متفوّق، متوسّط، متعثّر (يُبرز كشف الطلاب المتعثرين)، وجديد بانتظار الدفع.
const studentSpecs = [
  {
    email: `s.omar${DOMAIN}`,
    name: "عمر خالد",
    level: "متقدم",
    parts: 12,
    teacher: 0,
    pkg: pkgMid,
    lessons: 9,
    baseScore: 84,
    trend: 1.6,
    status: "Active",
    payment: "approved",
  },
  {
    email: `s.mariam${DOMAIN}`,
    name: "مريم عبدالله",
    level: "متوسط",
    parts: 5,
    teacher: 1,
    pkg: pkgBasic,
    lessons: 6,
    baseScore: 72,
    trend: 2.2,
    status: "Active",
    payment: "approved",
  },
  {
    email: `s.yusuf${DOMAIN}`,
    name: "يوسف طارق",
    level: "مبتدئ",
    parts: 1,
    teacher: 0,
    pkg: pkgBasic,
    lessons: 4,
    baseScore: 62,
    trend: -2.5, // متراجع — يُفعّل تنبيه «طالب متعثّر»
    status: "Active",
    payment: "approved",
    struggling: true,
  },
  {
    email: `s.sara${DOMAIN}`,
    name: "سارة محمود",
    level: "مبتدئ",
    parts: 0,
    teacher: null,
    pkg: pkgBasic,
    lessons: 0,
    baseScore: 0,
    trend: 0,
    status: "Payment Under Review", // يظهر في طابور «مدفوعات بانتظار المراجعة»
    payment: "pending",
  },
];

const students = [];
for (const s of studentSpecs) {
  const [u] = await sql`
    insert into users (email, password_hash, phone, user_type, status)
    values (${s.email}, ${hash}, '+201000000002', 'student', 'active') returning id`;
  const teacherId = s.teacher === null ? null : teachers[s.teacher].id;
  const [row] = await sql`
    insert into students (user_id, full_name, phone, country, current_level, memorized_parts,
                          teacher_id, package_id, status)
    values (${u.id}, ${s.name}, '+201000000002', 'مصر', ${s.level}, ${s.parts},
            ${teacherId}, ${s.pkg.id}, ${s.status})
    returning id`;
  students.push({ ...s, id: row.id, userId: u.id, teacherId });
}

// ---------- الاشتراكات والمدفوعات ----------
const [admin] = await sql`select id from users where user_type = 'admin' order by created_at limit 1`;

for (const s of students) {
  if (s.payment === "approved") {
    await sql`
      insert into student_subscriptions (student_id, package_id, start_date, end_date, status, classes_total, classes_used)
      values (${s.id}, ${s.pkg.id}, current_date - 20,
              current_date + make_interval(days => ${s.pkg.duration_days ?? 30}) - interval '20 days', 'active',
              ${s.pkg.classes_per_month ?? 8}, ${s.lessons})`;
    // دفعة لكل شهر من الأشهر الستة الماضية — يملأ رسم «الإيرادات — آخر ٦ أشهر»،
    // وأحدثها داخل الشهر الحالي كي لا يظهر «إيرادات الشهر» صفراً.
    for (let m = 5; m >= 0; m--) {
      await sql`
        insert into payments (student_id, amount, currency, payment_method, transaction_reference,
                              status, reviewed_by, reviewed_at, created_at)
        values (${s.id}, ${s.pkg.price}, 'EGP', 'manual_transfer',
                ${"TRX-" + Math.abs(hashCode(s.email + m))},
                'Payment Approved', ${admin?.id ?? null},
                date_trunc('month', now()) - make_interval(months => ${m}) + interval '3 days',
                date_trunc('month', now()) - make_interval(months => ${m}) + interval '2 days')`;
    }
  } else {
    await sql`
      insert into payments (student_id, amount, currency, payment_method, transaction_reference, status, created_at)
      values (${s.id}, ${s.pkg.price}, 'EGP', 'manual_transfer', 'TRX-PENDING-001',
              'Payment Under Review', now() - interval '2 days')`;
  }
}

function hashCode(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return h;
}

// ---------- الحصص والتقارير ----------
const surahs = [
  { name: "البقرة", from: 1, to: 20 },
  { name: "آل عمران", from: 15, to: 35 },
  { name: "النساء", from: 1, to: 18 },
  { name: "المائدة", from: 27, to: 45 },
  { name: "الأنعام", from: 60, to: 78 },
  { name: "الأعراف", from: 10, to: 30 },
  { name: "يوسف", from: 1, to: 22 },
  { name: "الكهف", from: 1, to: 25 },
  { name: "مريم", from: 1, to: 30 },
];
const lessonTypes = ["memorization", "revision", "tajweed", "memorization", "revision"];
const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

for (const s of students) {
  if (s.lessons === 0) continue;
  const [sub] = await sql`
    select id from student_subscriptions where student_id = ${s.id} and status = 'active' limit 1`;

  for (let i = 0; i < s.lessons; i++) {
    // موزّعة على آخر ٥ أشهر؛ آخر حصة قبل ٣ أيام للطالب النشِط، وقبل ٢٥ يوماً
    // للمتعثّر كي يظهر فعلاً تحت إشارة «بلا نشاط منذ أكثر من ١٤ يوماً».
    const recent = s.struggling ? 25 : 3;
    const daysAgo = recent + Math.round((s.lessons - 1 - i) * (145 / s.lessons));
    const sec = surahs[i % surahs.length];
    const drift = s.trend * i;
    const memo = clamp(s.baseScore + drift + 4);
    const tajweed = clamp(s.baseScore + drift - 3);
    const fluency = clamp(s.baseScore + drift + 1);
    const commit = clamp(s.baseScore + drift + 6);
    const overall = Math.round(memo * 0.4 + tajweed * 0.3 + fluency * 0.2 + commit * 0.1);

    const [cls] = await sql`
      insert into classes (student_id, teacher_id, subscription_id, start_time, end_time, status,
                           meet_link, student_join_clicked_at, teacher_join_clicked_at, created_at)
      values (${s.id}, ${s.teacherId}, ${sub?.id ?? null},
              now() - make_interval(days => ${daysAgo}),
              now() - make_interval(days => ${daysAgo}) + interval '45 minutes',
              'completed', 'https://meet.google.com/demo-link',
              now() - make_interval(days => ${daysAgo}),
              now() - make_interval(days => ${daysAgo}),
              now() - make_interval(days => ${daysAgo}))
      returning id`;

    const [report] = await sql`
      insert into lesson_reports (class_id, student_id, teacher_id, lesson_type, surah_name,
        ayah_from, ayah_to, memorization_score, tajweed_score, fluency_score, commitment_score,
        overall_score, teacher_notes, homework, created_at)
      values (${cls.id}, ${s.id}, ${s.teacherId}, ${lessonTypes[i % lessonTypes.length]}, ${sec.name},
        ${sec.from}, ${sec.to}, ${memo}, ${tajweed}, ${fluency}, ${commit}, ${overall},
        ${overall >= 80 ? "أداء ممتاز، انتبه لمواضع المدّ الطويل." : "يحتاج تثبيت الحفظ ومراجعة أحكام النون الساكنة."},
        ${"مراجعة " + sec.name + " من الآية " + sec.from + " إلى " + sec.to},
        now() - make_interval(days => ${daysAgo}))
      returning id`;

    if (i % 2 === 0) {
      await sql`
        insert into student_mistakes (student_id, lesson_report_id, mistake_category, mistake_type,
          surah_name, ayah_number, description, severity, status, created_at)
        values (${s.id}, ${report.id}, 'tajweed', 'مدّ',
                ${sec.name}, ${sec.from + 2}, 'قصّر المدّ المتصل', 'medium', 'new',
                now() - make_interval(days => ${daysAgo}))`;
    }

    // مستحق المعلم عن الحصة
    const rate = teacherSpecs[s.teacher].rate;
    await sql`
      insert into teacher_earnings (teacher_id, class_id, amount, currency, status, created_at)
      values (${s.teacherId}, ${cls.id}, ${rate}, 'EGP',
              ${i < 2 ? "paid" : i < 5 ? "approved" : "pending"},
              now() - make_interval(days => ${daysAgo}))
      on conflict (class_id) do nothing`;
  }

  // حصص قادمة: واحدة اليوم (تُفعّل مؤشر «حصص اليوم») واثنتان لاحقاً
  if (s.status === "Active") {
    await sql`
      insert into classes (student_id, teacher_id, subscription_id, start_time, end_time, status, meet_link)
      values (${s.id}, ${s.teacherId}, ${sub?.id ?? null},
              date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo' + interval '19 hours',
              date_trunc('day', now() at time zone 'Africa/Cairo') at time zone 'Africa/Cairo' + interval '19 hours 45 minutes',
              'meet_created', 'https://meet.google.com/demo-link')`;
    for (const [n, plus] of [[1, 2], [2, 5]]) {
      await sql`
        insert into classes (student_id, teacher_id, subscription_id, start_time, end_time, status, meet_link)
        values (${s.id}, ${s.teacherId}, ${sub?.id ?? null},
                now() + make_interval(days => ${plus}) + make_interval(hours => ${n}),
                now() + make_interval(days => ${plus}) + make_interval(hours => ${n}) + interval '45 minutes',
                'meet_created', 'https://meet.google.com/demo-link')`;
    }
  }
}

// ---------- المصحف: آخر موضع + ملاحظات على كلمات ----------
const mushafNotes = [
  { type: "tajweed", title: "تجويد", note: "أظهر الغنّة في النون المشددة." },
  { type: "memorization", title: "نسيان", note: "توقّف هنا واحتاج تلقيناً." },
  { type: "waqf_ibtida", title: "وقف وابتداء", note: "الوقف هنا غير مناسب للمعنى." },
  { type: "needs_review", title: "يحتاج مراجعة", note: "كرّر هذا الموضع في المراجعة القادمة." },
  { type: "excellent", title: "ممتاز", note: "أداء متقن، أحسنت." },
];

for (const s of students) {
  if (s.lessons === 0) continue;
  const page = 2 + s.parts * 20;
  const [ayah] = await sql`
    select surah_number, ayah_number from quran_ayahs where page_number = ${page} order by surah_number, ayah_number limit 1`;
  if (!ayah) continue;

  await sql`
    insert into student_mushaf_progress (student_id, teacher_id, surah_number, ayah_number, word_index, page_number)
    values (${s.id}, ${s.teacherId}, ${ayah.surah_number}, ${ayah.ayah_number}, 1, ${page})
    on conflict (student_id) do update set page_number = excluded.page_number`;

  // الطالب المتعثّر يحصل على ملاحظات مفتوحة أكثر (يُفعّل إشارة «≥ ٥ ملاحظات»)
  const count = s.struggling ? 6 : 3;
  const words = await sql`
    select surah_number, ayah_number, position from quran_words
    where page_number = ${page} and not is_end order by seq limit ${count}`;

  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    const n = mushafNotes[i % mushafNotes.length];
    await sql`
      insert into student_mushaf_mistakes (student_id, teacher_id, surah_number, ayah_number,
        word_index, page_number, mistake_type, title, note, is_resolved, created_at)
      values (${s.id}, ${s.teacherId}, ${w.surah_number}, ${w.ayah_number}, ${w.position}, ${page},
              ${n.type}, ${n.title}, ${n.note},
              ${!s.struggling && i === 0}, now() - make_interval(days => ${i * 3}))`;
  }
}

// ---------- الطالب المتعثّر: غياب متكرر ----------
const struggling = students.find((s) => s.struggling);
if (struggling) {
  // غياب داخل الشهر الحالي أيضاً كي يظهر مؤشر «غياب هذا الشهر» في لوحة الإدارة
  await sql`
    insert into classes (student_id, teacher_id, start_time, end_time, status, created_at)
    values (${struggling.id}, ${struggling.teacherId},
            greatest(date_trunc('month', now()) + interval '1 day', now() - interval '2 days'),
            greatest(date_trunc('month', now()) + interval '1 day', now() - interval '2 days') + interval '45 minutes',
            'no_show_student', now() - interval '2 days')`;
  for (const d of [8, 15]) {
    await sql`
      insert into classes (student_id, teacher_id, start_time, end_time, status, created_at)
      values (${struggling.id}, ${struggling.teacherId},
              now() - make_interval(days => ${d}), now() - make_interval(days => ${d}) + interval '45 minutes',
              'no_show_student', now() - make_interval(days => ${d}))`;
  }
}

// ---------- شكوى مفتوحة (تُظهر طابور الشكاوى) ----------
const firstStudent = students[0];
const [complaint] = await sql`
  insert into complaints (created_by_user_id, category, priority, status, subject, description, created_at)
  values (${firstStudent.userId}, 'schedule', 'medium', 'Open',
          'طلب تغيير موعد الحصة الأسبوعية',
          'أرجو تغيير موعد حصة الثلاثاء إلى وقت لاحق بسبب ارتباط دراسي.', now() - interval '1 day')
  returning id`;
await sql`
  insert into complaint_messages (complaint_id, sender_user_id, message)
  values (${complaint.id}, ${firstStudent.userId}, 'أرجو تغيير موعد حصة الثلاثاء إلى وقت لاحق بسبب ارتباط دراسي.')`;

// ---------- أوقات توفّر للمعلمين (يظهر الحجز الذاتي) ----------
for (const t of teachers) {
  for (let d = 1; d <= 6; d++) {
    await sql`
      insert into class_slots (teacher_id, start_time, duration_minutes, status)
      values (${t.id}, date_trunc('hour', now()) + make_interval(days => ${d}) + interval '17 hours', 45, 'open')`;
  }
}

// ---------- تقرير ----------
const [counts] = await sql`
  select
    (select count(*) from users where email like ${"%" + DOMAIN})::int as users,
    (select count(*) from classes)::int as classes,
    (select count(*) from lesson_reports)::int as reports,
    (select count(*) from student_mushaf_mistakes)::int as mushaf_notes,
    (select count(*) from teacher_earnings)::int as earnings`;

console.log("✅ بيانات العرض جاهزة:");
console.log(`   حسابات: ${counts.users} · حصص: ${counts.classes} · تقارير: ${counts.reports}`);
console.log(`   ملاحظات مصحف: ${counts.mushaf_notes} · مستحقات: ${counts.earnings}`);
console.log("");
console.log("   معلم:  m.abdulrahman@demo.elhafazah / demo1234");
console.log("   معلمة: m.huda@demo.elhafazah / demo1234");
console.log("   طالب:  s.omar@demo.elhafazah / demo1234   (متفوّق)");
console.log("   طالب:  s.yusuf@demo.elhafazah / demo1234  (متعثّر — يظهر في تنبيهات المعلم)");
console.log("");
console.log("   للحذف عند التسليم: node scripts/seed-showcase.mjs --clean");

await sql.end();
