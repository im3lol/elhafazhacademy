# النشر والإنتاج — أكاديمية الحفظة

## متطلّبات البيئة
| المتغيّر | إلزامي | الوصف |
|---------|:------:|------|
| `DATABASE_URL` | ✅ | سلسلة اتصال Postgres، مثل `postgres://user:pass@host:5432/elhafazah` |
| `AUTH_SECRET` | ✅ | سرّ توقيع الجلسات (JWT). **في الإنتاج يجب ضبطه** وإلا يتوقّف التطبيق. ولّده بـ `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | ✅* | الرابط العام للتطبيق (لروابط OAuth واسترجاع كلمة المرور)، مثل `https://academy.example.com` |
| `CRON_SECRET` | ✅* | سرّ حماية مسار المهام الدورية `/api/cron/tick` |
| `STORAGE_DIR` | ➖ | مجلد تخزين الملفات (افتراضي `storage`) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` | ➖ | تكامل Google Meet (اختياري) |

\* مطلوب عملياً لتشغيل الميزات المرتبطة (الجدولة، الروابط الخارجية).

> تكاملات **Resend (البريد)** و**Telegram** تُضبط مفاتيحها من **لوحة الأدمن** (جدول `app_settings`)، لا من البيئة.

## خطوات النشر
```bash
# 1) قاعدة البيانات: شغّل Postgres وطبّق المخطّط
#    db/init/01_schema.sql يُنشئ كل الجداول (يُطبَّق تلقائياً عند إقلاع حاوية Postgres لأول مرة)

# 2) التبعيات والبناء
npm ci
npm run build

# 3) البذر
node scripts/seed-admin.mjs     # حساب أدمن أوّلي (غيّر كلمته فوراً)
npm run seed:quran              # نص القرآن + القرّاء (من db/seed/quran.json المُضمَّن)

# 4) التشغيل
npm start                       # على المنفذ 3000
```

## بعد الإقلاع
- **فعّل التكاملات من لوحة الأدمن:** بيانات الدفع، Resend (لاسترجاع كلمة المرور)، Telegram، وربط Google Meet.
- **المهام الدورية:** جدّ ول استدعاء `GET /api/cron/tick?secret=$CRON_SECRET` كل دقيقة (تذكيرات الحصص، الغياب، توليد أوقات التوفّر المتكرّرة). راجع [BACKUP.md](BACKUP.md) لجدولة Windows/cron.
- **النسخ الاحتياطي:** [BACKUP.md](BACKUP.md) — `node scripts/backup.mjs` دورياً.
- **فحص الصحّة:** `GET /api/health` يُرجع `{status:"ok",db:"up"}` (لموازِن الحمل/المراقبة).

## الأمان (مطبَّق)
- رؤوس أمان لكل الاستجابات عبر [`src/proxy.ts`](../src/proxy.ts) (X-Frame-Options، nosniff، Referrer-Policy…).
- تقييد محاولات تسجيل الدخول، تجزئة كلمات المرور (bcrypt)، صلاحيات RBAC، سجلّ نشاطات (audit)، فحص محتوى الملفات المرفوعة، وحدود طول للنصوص.
- **تأكّد قبل النشر:** `AUTH_SECRET` و`CRON_SECRET` قويّان وفريدان، و`NEXT_PUBLIC_APP_URL` يطابق النطاق (HTTPS).

## قائمة تحقّق سريعة قبل الإطلاق
- [ ] `AUTH_SECRET` مضبوط (قويّ) — وإلا لن يُقلع التطبيق
- [ ] `DATABASE_URL` يشير لقاعدة الإنتاج
- [ ] `NEXT_PUBLIC_APP_URL` = نطاق HTTPS الحقيقي
- [ ] `CRON_SECRET` مضبوط + المهمة الدورية مجدولة
- [ ] بذر القرآن تمّ (`/api/health` و`/student/mushaf` يعملان)
- [ ] مفاتيح Resend/Telegram/Google من لوحة الأدمن
- [ ] نسخ احتياطي مجدول
- [ ] `npm run build` ينجح و`npm test` أخضر
