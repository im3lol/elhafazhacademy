# قاعدة البيانات — PostgreSQL

اتصال مباشر عبر `postgres.js` (الوسم المعلَّم ``sql`…` `` يمنع حقن SQL). القيم الرقمية تعود كنصوص ⇐ تُحوَّل بـ `Number()`.

## الاتصال

| البيئة | السلسلة |
|---|---|
| داخل Docker (التطبيق) | `postgres://postgres:postgres@db:5432/elhafazah` |
| من الجهاز (psql/سكربتات) | `postgres://postgres:postgres@127.0.0.1:5433/elhafazah` |
| الإنتاج (Supabase) | من لوحة Supabase ← Connect ← **Transaction pooler** |

```bash
docker exec -it elhafazah_db psql -U postgres -d elhafazah
```

## Supabase (الإنتاج)

كل أكاديمية لها مشروع Supabase خاصّ بها — لا قاعدة مشتركة بين النسخ.

المخطط الكامل (٣٥ جدولاً + الأدوار والصلاحيات والباقات وقوالب الإشعارات) يطبّقه
`npm run setup` تلقائياً وقت البناء. التطبيق يتصل بـ `postgres.js` مباشرةً — لا يستخدم مكتبة Supabase ولا مصادقتها — فالربط **تغيير سلسلة اتصال فقط**:

1. من لوحة Supabase: **Connect ← Transaction pooler** وانسخ السلسلة (المنفذ `6543`).
2. ضَع كلمة مرور القاعدة مكان `[YOUR-PASSWORD]` واضبط `DATABASE_URL` في بيئة الاستضافة.
3. أضِف `?sslmode=require` في آخر السلسلة.
4. هيّئ القاعدة مرة واحدة: `npm run setup`، ثم أنشئ حساب الإدارة من صفحة `/setup`.

> استخدم **Transaction pooler** لا الاتصال المباشر: بيئات serverless تفتح اتصالات كثيرة قصيرة العمر.

### الأمان: RLS مفعّل بلا سياسات — عن قصد

Supabase يفتح واجهة REST على schema `public` لأي شخص يملك المفتاح العام (anon). هذا التطبيق لا يستخدم
تلك الواجهة ولا مصادقة Supabase — تحكّم الوصول كله في طبقة التطبيق. لذلك فُعِّل RLS على كل الجداول
**بلا أي سياسة**، وسُحبت صلاحيات `anon` و`authenticated` على schema public:

- عبر المفتاح العام: لا شيء مقروء ولا مكتوب (وإلا لَقُرِئ `users` بما فيه `password_hash`).
- عبر `DATABASE_URL` بدور `postgres` (مالك الجداول): يتجاوز RLS طبيعياً — التطبيق يعمل كما هو.

تحذيرات `RLS Enabled No Policy` في لوحة Supabase **متوقَّعة وهي المطلوب هنا**، وليست خللاً يُصلَح
بإضافة سياسات. أي سياسة تُضاف تفتح ثغرة ما دامت الواجهة العامة غير مستخدمة.

## التهيئة التلقائية

`npm run setup` (ويُستدعى داخل `npm run build`) يطبّق المخطط ويبذر القرآن على أي
قاعدة، **محروساً**: ينشئ الجداول فقط إن لم تكن موجودة، ويتخطّى البذر إن كانت
البيانات فيها. فتُهيَّأ نسخة كل أكاديمية تلقائياً عند أول نشر — راجع
[HANDOVER.md](HANDOVER.md).

`01_schema.sql` وحده محروس بشرط القاعدة الفارغة (فيه `create table` بلا
`if not exists`). أمّا `02`→`05` فتُطبَّق **على كل نشرة**، لأنها القناة الوحيدة التي
تصل بها التحديثات إلى نسخة منشورة عند أي جهة.

يقرأ السكربت `DATABASE_URL` أو `POSTGRES_URL` أو `POSTGRES_URL_NON_POOLING`
(الأخيران يحقنهما تكامل Supabase على Vercel)، ويفضّل الاتصال المباشر للـ DDL.

عند **أول** تشغيل لحاوية Postgres محلياً (volume فارغ) تُطبَّق `db/init/*.sql` تلقائياً كذلك:

| الملف | المحتوى |
|---|---|
| `01_schema.sql` | كل الجداول (٣٥) + الفهارس + triggers — **على قاعدة فارغة فقط** |
| `02_seed.sql` | الأدوار، الصلاحيات، الباقات الافتراضية، قوالب الإشعارات |
| `03_app_settings.sql` | إعدادات التطبيق الأساسية |
| `04_constraints.sql` | **قناة الترحيل**: كل تغيير على المخطط بعد الإصدار الأول |
| `05_indexes.sql` | فهارس أداء + قيد الاشتراك النشط الواحد |

> أعدت التهيئة من الصفر: `docker compose down -v && docker compose up -d`.

**على قاعدة قائمة** (لا يُعاد تشغيل `db/init` إلا على volume فارغ) يكفي `npm run setup` —
يطبّق `02`→`05` دائماً. أو يدوياً:

```bash
docker exec -i elhafazah_db psql -U postgres -d elhafazah < db/init/04_constraints.sql
docker exec -i elhafazah_db psql -U postgres -d elhafazah < db/init/05_indexes.sql
```

### كيف أضيف تغييراً على المخطط

المنصّة تعمل نسخاً مستقلّة عند جهات مختلفة، كلٌّ على قاعدتها. **لا تعدّل
`01_schema.sql` وحدها** — فهي لا تُطبَّق إلا على قاعدة فارغة، فالتغيير يصل للتنصيبات
الجديدة فقط ويكسر كل نسخة قائمة تسحب الكود الجديد.

القاعدة: **`01_schema.sql` للتنصيب الجديد، و`04_constraints.sql` قناة الترحيل.**

| التغيير | أين | الصيغة |
|---|---|---|
| عمود جديد | `04_constraints.sql` | `alter table t add column if not exists c type;` |
| جدول جديد | `04_constraints.sql` | `create table if not exists t (...);` |
| تعديل قيد | `04_constraints.sql` | `alter table t drop constraint if exists k;` ثم `add constraint k ...` |
| فهرس | `05_indexes.sql` | `create index if not exists ...` |
| صلاحية/قالب إشعار | `02_seed.sql` | `insert ... on conflict (key) do nothing` |

**كل جملة تُضاف يجب أن تحتمل التكرار** — تُنفَّذ على كل نشرة عند كل جهة. وأضِف
التغيير إلى `01_schema.sql` كذلك كي تبدأ القواعد الجديدة كاملة من أول مرّة.

للتحقّق قبل الدفع — شغّل التهيئة مرّتين على قاعدة نظيفة وقارن العدّ:

```bash
docker run -d --name pg_test -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres   -e POSTGRES_DB=elhafazah -p 5434:5432 postgres:17-alpine
export DATABASE_URL="postgres://postgres:postgres@localhost:5434/elhafazah"
node scripts/setup.mjs && node scripts/setup.mjs
docker exec pg_test psql -U postgres -d elhafazah -c   "select (select count(*) from packages) pkgs, (select count(*) from permissions) perms;"
# المتوقّع: pkgs=3 perms=21 — أي تضاعف يعني أن جملةً ما ليست idempotent
docker rm -f pg_test
```

## الجداول (٣٥)

| المجال | الجداول |
|---|---|
| المستخدمون والصلاحيات | `users` · `roles` · `permissions` · `role_permissions` · `admin_users` |
| الطلاب والمعلمون | `students` · `teachers` |
| الباقات والمالية | `packages` · `student_subscriptions` · `payments` · `teacher_earnings` · `teacher_payouts` |
| الحصص | `classes` · `lesson_reports` · `student_mistakes` · `recurring_slots` · `class_slots` |
| الطلبات | `package_change_requests` · `student_teacher_requests` |
| الدعم والإشعارات | `complaints` · `complaint_messages` · `notifications` · `notification_templates` |
| الأمان | `audit_logs` · `password_resets` · `login_throttle` |
| الإعدادات | `app_settings` (مفاتيح التكاملات والهوية والمحتوى) |
| المصحف | `quran_surahs` · `quran_ayahs` · `quran_words` · `reciters` · `student_mushaf_progress` · `student_mushaf_mistakes` · `student_mushaf_bookmarks` · `student_achievements` |

## البذور

```bash
npm run setup               # المخطط + الأدوار والباقات + القرآن (يغطي كل ما تحته)

# أو منفردة (مع DATABASE_URL أو .env.local)
npm run seed:quran          # نص القرآن (السور/الآيات + القرّاء)
npm run seed:quran-layout   # تخطيط الأسطر (quran_words) لخط QCF
node scripts/seed-demo.mjs  # حسابات تجريبية (معلم + طالب)

# حساب الإدارة: المسار الطبيعي هو صفحة /setup في المتصفح.
# للطوارئ فقط — لا كلمة مرور افتراضية في المستودع:
node scripts/seed-admin.mjs <البريد> <كلمة المرور> "الاسم"
```

> السكربتات تقرأ `DATABASE_URL` من البيئة، وإلا من `.env.local` — فتعمل داخل Docker وخارجه.

## البيانات التجريبية (للعلم)

`seed-demo.mjs` ينشئ حسابات جاهزة للاستكشاف (idempotent — آمن للتكرار):

| الدور | البريد | كلمة المرور | الحالة |
|---|---|---|---|
| معلم | `teacher@demo.test` | `demo1234` | Active · تكلفة حصة 80 |
| طالب | `student@demo.test` | `demo1234` | Active · لدى المعلم · الباقة الأساسية |

> **غيّر كلمات المرور قبل أي استخدام حقيقي.**

## النسخ الاحتياطي

راجع **[BACKUP.md](BACKUP.md)** — سكربت `scripts/backup.mjs` ينشئ نسخة `.sql` تحت `backups/` (مستثناة من Git).
