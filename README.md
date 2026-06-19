# أكاديمية الحفظة — Elhafazah Academy

منصة إدارة أكاديمية لتحفيظ القرآن وتعليم التجويد. عربية بالكامل (RTL) مع وضع فاتح وداكن، وهوية بصرية بخط وألوان **ثمانية**.

## التقنيات

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (ألوان ثمانية، RTL، وضع داكن بـ class)
- **خط ثمانية** عبر `next/font/local` (`src/fonts`)
- **PostgreSQL عبر Docker Compose** (حاوية واحدة خفيفة) + `postgres.js`
- **مصادقة محلية**: bcrypt + JWT cookie (`jose`) — بدون خدمات خارجية
- **تخزين ملفات محلي** على القرص (`storage/`) عبر route handler محمي

## التشغيل محلياً

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # بناء إنتاجي
```

## قاعدة البيانات (PostgreSQL عبر Docker Compose)

يتطلب **Docker Desktop** شغّالاً. حاوية Postgres واحدة خفيفة.

```bash
docker compose up -d          # يشغّل Postgres ويطبّق db/init تلقائياً (مخطط + بذور)
docker compose down           # إيقاف
docker compose down -v        # إيقاف + حذف البيانات (إعادة من الصفر)
node scripts/seed-admin.mjs   # إنشاء حساب أدمن
npm run seed:quran            # بذر نص القرآن والقرّاء (للمصحف الشخصي)
```

ملفات SQL في `db/init/` تُطبَّق تلقائياً عند أول تشغيل (volume فارغ):

| الملف | المحتوى |
| --- | --- |
| `01_schema.sql` | كل الجداول (٢٢) + الفهارس |
| `02_seed.sql` | الأدوار، الصلاحيات، الباقات، قوالب الإشعارات |

- اتصال: `postgres://postgres:postgres@127.0.0.1:5433/elhafazah` (في `.env.local` كـ `DATABASE_URL`)
- psql: `docker exec -it elhafazah_db psql -U postgres -d elhafazah`

## القرارات المعتمدة (V1)

- البنية: **PostgreSQL مباشر عبر Docker** (بدون Supabase — أخف وأسرع)
- المصادقة: **bcrypt + JWT cookie** (التحكم بالوصول في طبقة التطبيق)
- التخزين: **ملفات محلية** على القرص عبر route handler محمي
- الدخول: **بريد + كلمة مرور** (الهاتف لاحقاً)
- الدفع: **تحويل يدوي + رفع إثبات** ومراجعة الإدارة
- العملة/التوقيت: **EGP / Africa/Cairo**
- Google Meet: **Google Cloud Console + OAuth** لحساب الأكاديمية (Workspace غير مطلوب)

راجع `elhafazah_academy_implementation.md` لوثيقة التنفيذ الكاملة.

## التوثيق

| الملف | المحتوى |
| --- | --- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | النشر والإنتاج — متغيّرات البيئة وقائمة التحقّق |
| [docs/MUSHAF.md](docs/MUSHAF.md) | وحدة المصحف الشخصي — المصادر والبذر والاعتماديات |
| [docs/BACKUP.md](docs/BACKUP.md) | النسخ الاحتياطي والاستعادة |

فحص الصحّة للنشر/المراقبة: `GET /api/health`.
