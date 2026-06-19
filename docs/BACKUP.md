# النسخ الاحتياطي والاستعادة — قاعدة البيانات

قاعدة البيانات تعمل داخل حاوية Docker (`elhafazah_db`, قاعدة `elhafazah`).

## نسخة احتياطية يدوية

```bash
node scripts/backup.mjs
```

تُحفظ في `backups/elhafazah-<التاريخ>.sql`. يمكن تخصيص الحاوية/القاعدة عبر متغيّرات البيئة `DB_CONTAINER` / `DB_NAME` / `DB_USER`.

## الاستعادة من نسخة

```bash
# نسخ ملف الـ SQL إلى الحاوية ثم تنفيذه
docker exec -i elhafazah_db psql -U postgres -d elhafazah < backups/elhafazah-<التاريخ>.sql
```

> للاستعادة على قاعدة نظيفة: أعِد إنشاء القاعدة أولاً (`dropdb`/`createdb`) أو شغّل حاوية جديدة قبل التنفيذ.

## الجدولة (يومياً)

- **Windows (Task Scheduler):** أنشئ مهمة يومية تشغّل
  `node E:\Dev\Elhafazah academy\scripts\backup.mjs` في مجلد المشروع.
- **Linux/cron:**
  ```
  0 3 * * * cd /path/to/project && node scripts/backup.mjs
  ```

## توصيات

- احتفظ بنسخ خارج الخادم (تخزين سحابي) دورياً.
- اختبر الاستعادة على بيئة منفصلة بين الحين والآخر.
- استبعد مجلد `backups/` من Git (موجود في `.gitignore`).
