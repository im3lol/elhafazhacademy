# دوكرة المنظومة — Docker

المنظومة كاملة (تطبيق Next.js + قاعدة Postgres) تعمل بـ Docker Compose. لا تحتاج تثبيت Node أو Postgres على جهازك — فقط **Docker Desktop**.

## الخدمات (services)

| الخدمة | الوصف | المنفذ (المضيف) |
|---|---|---|
| `app` | تطبيق Next.js (إخراج standalone) | **8080** ← 3000 داخل الحاوية |
| `db` | PostgreSQL 17 (alpine) | **5433** ← 5432 |
| `seed` | مهمة لمرّة واحدة لبذر القرآن + الأدمن + البيانات التجريبية | — (profile) |

- المنفذ على الجهاز قابل للضبط عبر `APP_PORT` (الافتراضي 8080).
- `db` يطبّق ملفات `db/init/*.sql` تلقائياً عند **أول** إنشاء للقاعدة (الـ volume فارغ).
- بيانات القرآن ليست SQL (JSON كبير) ⇐ تُبذَر عبر خدمة `seed`.

## التشغيل

```bash
# بناء + تشغيل التطبيق والقاعدة
docker compose up -d --build

# بذر البيانات (مرّة واحدة): قرآن + أدمن + حسابات تجريبية
docker compose --profile seed run --rm seed

# افتح http://localhost:8080
```

## أوامر شائعة

```bash
docker compose ps                 # حالة الحاويات والمنافذ
docker compose logs -f app        # سجلّ التطبيق المباشر
docker compose restart app        # إعادة تشغيل التطبيق
docker compose up -d --build app  # إعادة بناء بعد تغيير الكود
docker compose down               # إيقاف (تبقى البيانات في الـ volume)
docker compose down -v            # إيقاف + مسح القاعدة (بداية نظيفة)
```

تغيير المنفذ:
```bash
# Linux / macOS
APP_PORT=9000 docker compose up -d
# Windows PowerShell
$env:APP_PORT="9000"; docker compose up -d
```

## متغيّرات البيئة في compose

تُمرَّر لخدمة `app`:

| المتغيّر | القيمة الافتراضية | ملاحظة |
|---|---|---|
| `DATABASE_URL` | `postgres://postgres:postgres@db:5432/elhafazah` | اسم الخدمة `db` هو المضيف داخل الشبكة |
| `AUTH_SECRET` | `${AUTH_SECRET:-…}` | **اضبط قيمة قويّة** لأي استخدام جدّي |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:8080` | عدّله ليطابق منفذك/نطاقك |
| `NODE_ENV` | `production` | — |

لتمرير سرّ قويّ:
```bash
# Linux / macOS
AUTH_SECRET="$(openssl rand -base64 32)" docker compose up -d
# Windows PowerShell
$env:AUTH_SECRET="ضع-سرّاً-قويّاً"; docker compose up -d
```

## الصورة (Dockerfile)

بناء متعدّد المراحل:
1. **deps** — `npm ci`.
2. **builder** — `npm run build` (مع `NODE_OPTIONS=--max-old-space-size=4096` لتفادي نفاد الذاكرة في Turbopack).
3. **runner** — صورة خفيفة تشغّل إخراج Next **standalone** بـ `node server.js` على `0.0.0.0:3000`.

> يتطلّب `output: "standalone"` في `next.config.ts` (مضبوط).

## استكشاف الأعطال

- **`This page couldn't load` / خطأ خادم**: غالباً القاعدة لم تُبذَر بعد — شغّل خدمة `seed`. أو `AUTH_SECRET`/`DATABASE_URL` غير مضبوطين.
- **نفاد ذاكرة أثناء البناء (heap out of memory)**: زِد ذاكرة Docker Desktop، أو حدّ `--max-old-space-size` مضبوط في الـ Dockerfile.
- **المصحف فارغ**: لم تُبذَر بيانات القرآن — شغّل `docker compose --profile seed run --rm seed`.
- **psql داخل الحاوية**: `docker exec -it elhafazah_db psql -U postgres -d elhafazah`.
