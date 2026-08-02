-- فهارس أداء. idempotent — آمن للتشغيل على قاعدة قائمة:
--   docker exec -i elhafazah_db psql -U postgres -d elhafazah < db/init/05_indexes.sql
--
-- القاعدة انتقلت إلى خادم بعيد، فكل مسح تسلسلي صار يكلّف رحلة شبكة كاملة.
-- كل فهرس هنا يخدم استعلاماً موجوداً فعلاً في الكود.

-- أكثر استعلام تنفيذاً في التطبيق: عدّاد الإشعارات غير المقروءة
-- (يُنفَّذ في تخطيطات الأدوار الثلاثة + استطلاع كل ٣٠ ثانية لكل تبويب مفتوح).
-- الفهرس الوحيد الموجود على status='pending' لا يخدمه إطلاقاً.
create index if not exists idx_notifications_unread
  on notifications (user_id) where channel = 'app' and status <> 'read';
create index if not exists idx_notifications_inbox
  on notifications (user_id, created_at desc) where channel = 'app';

-- متوسط تقييم المعلم (لوحة المعلم)
create index if not exists idx_reports_teacher on lesson_reports (teacher_id);

-- مستحقات المعلم: مفتاح خارجي بلا فهرس، يُستعلم في ٤ صفحات
create index if not exists idx_earnings_teacher_status on teacher_earnings (teacher_id, status);

-- مدفوعات الطالب (صفحة الدفع + ملف الطالب لدى الأدمن)
create index if not exists idx_payments_student on payments (student_id, created_at desc);

-- الشكاوى: الطرفان يُستعلمان بـ OR — فهرسان يتيحان BitmapOr
create index if not exists idx_complaints_creator on complaints (created_by_user_id);
create index if not exists idx_complaints_against on complaints (against_user_id);
create index if not exists idx_complaint_messages_thread on complaint_messages (complaint_id, created_at);

-- أخطاء المصحف المرتبطة بحصة (تقرير الحصة)
create index if not exists idx_mushaf_mistakes_class on student_mushaf_mistakes (class_id);

-- عدّادات طوابير الأدمن
create index if not exists idx_student_requests_status on student_teacher_requests (status);
create index if not exists idx_pkg_requests_final on package_change_requests (final_status);

-- الاشتراك النشط للطالب (فحص رصيد الباقة عند كل حجز/جدولة)
create index if not exists idx_subscriptions_student_status
  on student_subscriptions (student_id, status);
