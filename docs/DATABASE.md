# قاعدة البيانات — PostgreSQL

اتصال مباشر عبر `postgres.js` (الوسم المعلَّم ``sql`…` `` يمنع حقن SQL). القيم الرقمية تعود كنصوص ⇐ تُحوَّل بـ `Number()`.

## الاتصال

| البيئة | السلسلة |
|---|---|
| داخل Docker (التطبيق) | `postgres://postgres:postgres@db:5432/elhafazah` |
| من الجهاز (psql/سكربتات) | `postgres://postgres:postgres@127.0.0.1:5433/elhafazah` |

```bash
docker exec -it elhafazah_db psql -U postgres -d elhafazah
```

## التهيئة التلقائية

عند **أول** تشغيل للقاعدة (volume فارغ) تُطبَّق `db/init/*.sql` تلقائياً:

| الملف | المحتوى |
|---|---|
| `01_schema.sql` | كل الجداول (٣٤) + الفهارس + triggers |
| `02_seed.sql` | الأدوار، الصلاحيات، الباقات الافتراضية، قوالب الإشعارات |
| `03_app_settings.sql` | إعدادات التطبيق الأساسية |

> أعدت التهيئة من الصفر: `docker compose down -v && docker compose up -d`.

## الجداول (٣٤)

| المجال | الجداول |
|---|---|
| المستخدمون والصلاحيات | `users` · `roles` · `permissions` · `role_permissions` · `admin_users` |
| الطلاب والمعلمون | `students` · `teachers` |
| الباقات والمالية | `packages` · `student_subscriptions` · `payments` · `teacher_earnings` · `teacher_payouts` |
| الحصص | `classes` · `lesson_reports` · `student_mistakes` · `recurring_slots` · `class_slots` |
| الطلبات | `package_change_requests` · `student_teacher_requests` |
| الدعم والإشعارات | `complaints` · `complaint_messages` · `notifications` · `notification_templates` |
| الأمان | `audit_logs` · `password_resets` · `login_throttle` |
| المصحف | `quran_surahs` · `quran_ayahs` · `quran_words` · `reciters` · `student_mushaf_progress` · `student_mushaf_mistakes` · `student_mushaf_bookmarks` · `student_achievements` |

## البذور

```bash
# داخل Docker (مرّة واحدة): قرآن + أدمن + بيانات تجريبية
docker compose --profile seed run --rm seed

# أو يدوياً (مع DATABASE_URL أو .env.local)
npm run seed:quran          # نص القرآن (السور/الآيات + القرّاء)
npm run seed:quran-layout   # تخطيط الأسطر (quran_words) لخط QCF
node scripts/seed-admin.mjs # حساب الأدمن
node scripts/seed-demo.mjs  # حسابات تجريبية (معلم + طالب)
```

> السكربتات تقرأ `DATABASE_URL` من البيئة، وإلا من `.env.local` — فتعمل داخل Docker وخارجه.

## البيانات التجريبية (للعلم)

`seed-demo.mjs` ينشئ حسابات جاهزة للاستكشاف (idempotent — آمن للتكرار):

| الدور | البريد | كلمة المرور | الحالة |
|---|---|---|---|
| أدمن | `admin@elhafazah.test` | `admin1234` | مفعّل |
| معلم | `teacher@demo.test` | `demo1234` | Active · تكلفة حصة 80 |
| طالب | `student@demo.test` | `demo1234` | Active · لدى المعلم · الباقة الأساسية |

> **غيّر كلمات المرور قبل أي استخدام حقيقي.**

## النسخ الاحتياطي

راجع **[BACKUP.md](BACKUP.md)** — سكربت `scripts/backup.mjs` ينشئ نسخة `.sql` تحت `backups/` (مستثناة من Git).
