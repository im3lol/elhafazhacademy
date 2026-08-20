# النشر والإنتاج — أكاديمية الحفظة

> **تشغيل نسخة لأكاديمية جديدة؟** المسار الكامل (Fork + Vercel + تكامل Supabase +
> صفحة `/setup`) موصوف في **[HANDOVER.md](HANDOVER.md)** — لا يحتاج أياً من
> الخطوات اليدوية أدناه. هذا الملف للنشر اليدوي والتفاصيل المرجعية.

## متطلّبات البيئة
| المتغيّر | إلزامي | الوصف |
|---------|:------:|------|
| `DATABASE_URL` | ✅* | سلسلة اتصال Postgres، مثل `postgres://user:pass@host:5432/elhafazah` |
| `POSTGRES_URL` / `POSTGRES_URL_NON_POOLING` | ✅* | يحقنهما تكامل Supabase على Vercel — يُقبلان بديلاً عن `DATABASE_URL` بلا ضبط يدوي |
| `AUTH_SECRET` | ✅ | سرّ توقيع الجلسات (JWT). **في الإنتاج يجب ضبطه** وإلا يتوقّف التطبيق. ولّده بـ `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ➖ | الرابط العام للتطبيق (لروابط OAuth واسترجاع كلمة المرور). على Vercel يُشتق تلقائياً من `VERCEL_PROJECT_PRODUCTION_URL` — يُضبط يدوياً عند استخدام نطاق مخصّص |
| `CRON_SECRET` | ✅* | سرّ حماية مسار المهام الدورية `/api/cron/tick` |
| `STORAGE_DIR` | ➖ | مجلد تخزين الملفات (افتراضي `storage`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | ➖ | تكامل Google Meet (اختياري) |

\* واحدة من سلاسل الاتصال الثلاث تكفي. `CRON_SECRET` مطلوب عملياً لتشغيل المهام الدورية.

> تكاملات **Resend (البريد)** و**Telegram** تُضبط مفاتيحها من **لوحة الأدمن** (جدول `app_settings`)، لا من البيئة.

## خطوات النشر
```bash
# 1) التبعيات والبناء — `npm run build` يستدعي scripts/setup.mjs أولاً فيطبّق
#    المخطط ويبذر القرآن على قاعدة فارغة، ويتخطّى نفسه على قاعدة مهيّأة.
npm ci
npm run build

# 2) حساب الإدارة الأول: افتح /setup في المتصفح (يُغلق تلقائياً بعد الإنشاء).
#    للطوارئ فقط:
#    node scripts/seed-admin.mjs <البريد> <كلمة المرور> "الاسم"

# 3) التشغيل
npm start                       # على المنفذ 3000
```

> لتهيئة القاعدة وحدها بلا بناء: `npm run setup`.

## بعد الإقلاع
- **فعّل التكاملات من لوحة الأدمن:** بيانات الدفع، Resend (لاسترجاع كلمة المرور)، Telegram، وربط Google Meet.
- **المهام الدورية:** جدّ ول استدعاء `GET /api/cron/tick?secret=$CRON_SECRET` كل دقيقة (تذكيرات الحصص، الغياب، توليد أوقات التوفّر المتكرّرة). راجع [BACKUP.md](BACKUP.md) لجدولة Windows/cron.
- **النسخ الاحتياطي:** [BACKUP.md](BACKUP.md) — `node scripts/backup.mjs` دورياً.
- **فحص الصحّة:** `GET /api/health` يُرجع `{status:"ok",db:"up"}` (لموازِن الحمل/المراقبة).

## الأمان (مطبَّق)
- رؤوس أمان لكل الاستجابات عبر [`src/proxy.ts`](../src/proxy.ts) (X-Frame-Options، nosniff، Referrer-Policy…).
- تقييد محاولات تسجيل الدخول، تجزئة كلمات المرور (bcrypt)، صلاحيات RBAC، سجلّ نشاطات (audit)، فحص محتوى الملفات المرفوعة، وحدود طول للنصوص.
- **إثباتات الدفع خاصّة (private):** تُرفع إلى Vercel Blob بوصول `private` ولا تُقرأ إلا عبر `/api/files/payment-proofs/...` بعد فحص الملكية. الملفات المرفوعة قبل هذا التغيير بقيت عامّة — تلزم إعادة رفعها أو حذفها من مخزن Blob.
- **تأكّد قبل النشر:** `AUTH_SECRET` و`CRON_SECRET` قويّان وفريدان، و`NEXT_PUBLIC_APP_URL` يطابق النطاق (HTTPS).

## قائمة تحقّق سريعة قبل الإطلاق
- [ ] `AUTH_SECRET` مضبوط (قويّ) — وإلا لن يُقلع التطبيق
- [ ] سلسلة اتصال الإنتاج مضبوطة (`DATABASE_URL` أو `POSTGRES_URL`)
- [ ] `NEXT_PUBLIC_APP_URL` = نطاق HTTPS الحقيقي (عند استخدام نطاق مخصّص)
- [ ] `CRON_SECRET` مضبوط + المهمة الدورية مجدولة
- [ ] بطاقة **قاعدة البيانات** في `/admin/settings` بلا تحذير (الجداول ٣٥، الكلمات ٨٣٬٦٦٥)
- [ ] مفاتيح Resend/Telegram/Google من لوحة الأدمن
- [ ] نسخ احتياطي مجدول
- [ ] `npm run build` ينجح و`npm test` أخضر
