-- بيانات أولية: صلاحيات، أدوار، باقات، قوالب إشعارات

insert into permissions (key, description) values
  ('students.view','عرض الطلاب'),('students.create','إنشاء طالب'),('students.update','تعديل بيانات الطالب'),
  ('students.suspend','إيقاف طالب'),('teachers.view','عرض المعلمين'),('teachers.approve','اعتماد معلم'),
  ('teachers.update','تعديل بيانات المعلم'),('classes.view','عرض الحصص'),('classes.create','إنشاء حصة'),
  ('classes.update','تعديل حصة'),('classes.join_meet','دخول اجتماع الحصة'),('classes.monitor','مراقبة الحصص المباشرة'),
  ('packages.view','عرض الباقات'),('packages.update','تعديل الباقات'),
  ('package_change_requests.approve','اعتماد طلب تغيير الباقة'),('payments.review','مراجعة المدفوعات'),
  ('complaints.manage','إدارة الشكاوى'),('finance.view','عرض المالية'),('settings.manage','إدارة الإعدادات'),
  ('roles.manage','إدارة الأدوار والصلاحيات'),('audit_logs.view','عرض سجل النشاطات')
on conflict (key) do nothing;

insert into roles (name, description) values
  ('super_admin','مدير عام — كل الصلاحيات'),
  ('support_agent','موظف دعم — الشكاوى والطلبات'),
  ('accountant','مسؤول حسابات — المالية والمدفوعات'),
  ('teacher_supervisor','مشرف معلمين — متابعة الأداء والمراقبة')
on conflict (name) do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r cross join permissions p where r.name='super_admin'
on conflict do nothing;

-- صلاحيات الأدوار المتخصّصة (أدمن محدودو الصلاحيات)
insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.key = any (array[
    'complaints.manage','package_change_requests.approve','students.view','teachers.view','classes.view'])
where r.name = 'support_agent'
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.key = any (array[
    'finance.view','payments.review','students.view','classes.view'])
where r.name = 'accountant'
on conflict do nothing;

insert into role_permissions (role_id, permission_id)
select r.id, p.id from roles r join permissions p on p.key = any (array[
    'teachers.view','teachers.approve','classes.view','classes.monitor','students.view'])
where r.name = 'teacher_supervisor'
on conflict do nothing;

insert into packages (name, description, classes_per_month, hours_per_month, price, currency, duration_days, type, is_active) values
  ('الباقة الأساسية','٨ حصص شهرياً — مناسبة للمبتدئين',8,8,450,'EGP',30,'basic',true),
  ('الباقة المتوسطة','١٢ حصة شهرياً — توازن الحفظ والمراجعة',12,12,650,'EGP',30,'standard',true),
  ('الباقة المكثفة','٢٠ حصة شهرياً — للحفظ السريع',20,20,950,'EGP',30,'intensive',true)
on conflict do nothing;

insert into notification_templates (key, channel, title_ar, body_ar) values
  ('account_created','app','تم إنشاء حسابك','مرحباً {{name}}، تم إنشاء حسابك بنجاح. بانتظار رفع إثبات الدفع.'),
  ('payment_received','app','تم استلام إثبات الدفع','استلمنا إثبات دفعك وهو قيد المراجعة.'),
  ('payment_approved','whatsapp','تم تفعيل حسابك','تم تفعيل حسابك في أكاديمية الحفظة.'),
  ('payment_rejected','whatsapp','تم رفض إثبات الدفع','تعذّر قبول إثبات الدفع. السبب: {{reason}}.'),
  ('class_reminder_5min','whatsapp','حصتك تبدأ قريباً','تبدأ حصتك بعد ٥ دقائق. رابط الدخول: {{meet_link}}'),
  ('package_changed','app','تم تغيير باقتك','تم تطبيق تغيير الباقة الخاص بك بنجاح.'),
  ('complaint_replied','app','رد جديد على شكواك','تم الرد على تذكرتك رقم {{ticket}}.')
on conflict (key) do nothing;
