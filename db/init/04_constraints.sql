-- ═══ قناة الترحيل (migrations) ═══
-- كل تغيير على المخطط بعد الإصدار الأول يُكتب هنا. `scripts/setup.mjs` يطبّق هذا
-- الملف على كل نشرة، بينما 01_schema.sql لا يُطبَّق إلا على قاعدة فارغة — فتعديل
-- 01 وحده يصل للتنصيبات الجديدة فقط ويكسر كل نسخة قائمة عند الجهات الأخرى.
--
-- ⚠️ كل جملة هنا يجب أن تحتمل التكرار: `if not exists` / `drop ... if exists` قبل
--    `add`. راجع «كيف أضيف تغييراً على المخطط» في docs/DATABASE.md.
--
-- للتطبيق اليدوي على قاعدة قائمة:
--   docker exec -i elhafazah_db psql -U postgres -d elhafazah < db/init/04_constraints.sql

-- تسريع فحص رصيد الباقة (الحصص المحجوزة غير المنتهية لكل اشتراك)
create index if not exists idx_classes_subscription on classes (subscription_id, status);

-- حالة 'ended' (انتهت الحصة ولم يُسجَّل تقريرها): بدونها تبقى الحصة 'live' للأبد.
alter table classes drop constraint if exists classes_status_check;
alter table classes add constraint classes_status_check check (status in
  ('scheduled','meet_created','meet_sent','waiting','live','ended','completed',
   'no_show_student','no_show_teacher','cancelled','rescheduled'));

-- تقرير واحد لكل حصة: بدونه يؤدي إرسال النموذج مرتين (تبويب ثانٍ، إعادة محاولة)
-- إلى تقريرين وخصم حصتين من الباقة عن حصة واحدة.
--
-- ⚠️ يفشل هذا الأمر على قاعدة فيها تكرار سابق. لمعرفة الحصص المتأثرة:
--   select class_id, count(*) from lesson_reports group by class_id having count(*) > 1;
-- الحذف قرار إداري (يُفقد بيانات تقارير) — بعد المراجعة، للإبقاء على الأحدث لكل حصة:
--   delete from lesson_reports r using lesson_reports k
--   where r.class_id = k.class_id and r.created_at < k.created_at;
create unique index if not exists uq_lesson_reports_class on lesson_reports (class_id);
