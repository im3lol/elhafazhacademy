-- قيود أُضيفت بعد الإصدار الأول. الملف idempotent — آمن للتشغيل على قاعدة قائمة:
--   docker exec -i elhafazah_db psql -U postgres -d elhafazah < db/init/04_constraints.sql

-- تقرير واحد لكل حصة: بدونه يؤدي إرسال النموذج مرتين (تبويب ثانٍ، إعادة محاولة)
-- إلى تقريرين وخصم حصتين من الباقة عن حصة واحدة.
create unique index if not exists uq_lesson_reports_class on lesson_reports (class_id);

-- تسريع فحص رصيد الباقة (الحصص المحجوزة غير المنتهية لكل اشتراك)
create index if not exists idx_classes_subscription on classes (subscription_id, status);
