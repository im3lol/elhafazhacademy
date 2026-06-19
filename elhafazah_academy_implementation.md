# Implementation.md — منصة أكاديمية الحفظة لتحفيظ وتعليم القرآن

> **القرارات المعتمدة (V1) — مُحدّثة:** **PostgreSQL مباشر عبر Docker Compose** (حاوية واحدة خفيفة، لا Supabase) + `postgres.js`. المصادقة **bcrypt + JWT cookie** (`jose`)، والتحكم بالوصول في طبقة التطبيق (لا RLS). **تخزين الملفات محلياً** على القرص عبر route handler محمي. الدخول بـ **البريد + كلمة المرور** (الهاتف لاحقاً). الدفع: **تحويل يدوي + رفع إثبات**. العملة: **جنيه مصري (EGP)** والتوقيت **Africa/Cairo**. **Google Meet**: عبر Google Cloud Console + OAuth (Workspace غير مطلوب). الواجهة: **عربي فقط RTL** مع وضعين **فاتح وداكن**. الهوية **Emerald + Gold + Ivory** وخط **ثمانية**.
>
> _ملاحظة: أقسام قاعدة البيانات أدناه (11.x) كُتبت أصلاً لـ Supabase/RLS؛ التنفيذ الفعلي حوّلها إلى Postgres مباشر بنفس الجداول مع نقل التحكم للتطبيق. المخطط الفعلي في `db/init/`._
>
> **سجل المراجعة (تجهيز ما قبل البدء):** تم سدّ الثغرات التالية: حقول ناقصة في جدولي `students` و`teachers` (هاتف/واتساب/الأوقات/الإجازات/خبرة التجويد)، جدول جديد `student_teacher_requests` لطلبات المعلم، جدول `notification_templates`، قسم فهارس (11.23)، ربط Supabase Auth (11.24)، أمثلة سياسات RLS (11.25)، توحيد enum حالات الحصة (19)، endpoints لطلبات الطلاب (13.8)، وتحديث الهوية البصرية لخط وألوان ثمانية (25). المنصة عربية فقط (RTL) في V1.

## 1. الهدف من المشروع

بناء منصة تشغيل وإدارة متكاملة لأكاديمية الحفظة، تجمع بين:

- إدارة الطلاب والمعلمين.
- جدولة حصص القرآن.
- متابعة الحفظ والمراجعة والتجويد.
- إدارة الباقات وطلبات التغيير.
- الشكاوى والدعم الفني.
- المالية ومستحقات المعلمين.
- إنشاء اجتماعات Google Meet تلقائياً.
- إشعارات WhatsApp / Telegram.
- صلاحيات إدارية تفصيلية.

المنصة ليست مجرد LMS، بل نظام إدارة أكاديمية كامل يشبه:

**Quran Academy ERP + Student Progress System + Teacher Operations Dashboard**

---

## 2. أنواع المستخدمين

### 2.1 الطالب Student

صلاحياته الأساسية:

- التسجيل كطالب.
- رفع إثبات التحويل.
- انتظار تفعيل الحساب.
- مشاهدة الداش بورد.
- مشاهدة جدول الحصص.
- دخول Google Meet للحصة.
- متابعة التقدم والحفظ والمراجعة.
- مشاهدة الأخطاء التي سجلها المعلم.
- طلب تغيير الباقة.
- تقديم شكوى أو اقتراح.
- تعديل بياناته الشخصية.
- التحكم في الإشعارات.

---

### 2.2 المعلم Teacher

صلاحياته الأساسية:

- التسجيل كمعلم.
- انتظار اعتماد الإدارة.
- مشاهدة طلابه.
- مشاهدة جدول الحصص.
- دخول Google Meet للحصة.
- تسجيل حضور الطالب.
- تسجيل تقدم الطالب.
- تسجيل الأخطاء اللغوية والتجويدية وأخطاء الحفظ.
- الموافقة أو الرفض المبدئي على طلب تغيير الباقة.
- طلب استقبال طلاب جدد.
- رفع شكوى ضد طالب للإدارة.
- مشاهدة الرصيد والمعاملات المالية.

---

### 2.3 الإدارة Admin

صلاحياتها الأساسية:

- رؤية كل التقارير.
- إدارة الطلاب.
- إدارة المعلمين.
- إدارة الحصص.
- إدارة الباقات.
- إدارة طلبات تغيير الباقات.
- مراجعة إثباتات الدفع وتفعيل الحسابات.
- مراقبة الحصص المباشرة.
- دخول Google Meet للمراقبة عند الحاجة.
- إدارة الشكاوى.
- إدارة المالية.
- إدارة الإشعارات.
- إدارة الربط مع WhatsApp / Telegram / Google Meet.
- إدارة صلاحيات المستخدمين الإداريين.
- مراجعة سجل النشاطات Audit Logs.

---

### 2.4 موظف الدعم Support Agent

صلاحياته المقترحة:

- رؤية الشكاوى فقط.
- رؤية طلبات تغيير الباقة.
- متابعة طلبات التفعيل.
- التواصل مع الطلاب والمعلمين.
- لا يرى المالية إلا إذا تم منحه صلاحية.

---

### 2.5 مسؤول الحسابات Accountant

صلاحياته المقترحة:

- رؤية المدفوعات.
- مراجعة إثباتات التحويل.
- إدارة مستحقات المعلمين.
- إصدار تقارير مالية.
- لا يملك صلاحية تعديل بيانات الحصص أو التقييمات.

---

### 2.6 مشرف المعلمين Teacher Supervisor

صلاحياته المقترحة:

- متابعة أداء المعلمين.
- مراجعة تقييمات الطلاب للمعلمين.
- مراجعة شكاوى المعلمين والطلاب.
- مراقبة الحصص.
- اقتراح إعادة توزيع الطلاب.

---

## 3. نظام الصلاحيات RBAC

يجب بناء النظام على Role Based Access Control من البداية.

### الجداول الأساسية للصلاحيات

- roles
- permissions
- role_permissions
- admin_users

### أمثلة Permissions

```txt
students.view
students.create
students.update
students.suspend
teachers.view
teachers.approve
teachers.update
classes.view
classes.create
classes.update
classes.join_meet
classes.monitor
packages.view
packages.update
package_change_requests.approve
payments.review
complaints.manage
finance.view
settings.manage
roles.manage
audit_logs.view
```

---

## 4. رحلة التسجيل والتفعيل

## 4.1 تسجيل الطالب

الطالب يفتح صفحة التسجيل ويختار:

```txt
أنا طالب
```

ثم يدخل:

- الاسم الكامل.
- رقم الهاتف.
- رقم واتساب.
- البريد الإلكتروني.
- الدولة.
- المدينة.
- العمر.
- الجنس.
- مستوى الحفظ الحالي.
- هل لديه خبرة سابقة في التجويد؟
- الباقة المطلوبة.
- كلمة المرور.

بعد التسجيل تكون حالة الحساب:

```txt
Pending Payment
```

---

## 4.2 إثبات الدفع

بعد التسجيل تظهر للطالب صفحة الدفع:

- بيانات التحويل.
- اسم الحساب أو المحفظة.
- رقم التحويل.
- زر رفع صورة إثبات الدفع.
- زر التواصل مع الدعم عبر واتساب.

يفضل أن يتم رفع الإثبات داخل المنصة، مع إمكانية إرسال نفس الإثبات للدعم عبر واتساب.

### حالات الدفع

```txt
Pending Payment
Payment Uploaded
Payment Under Review
Payment Approved
Payment Rejected
```

---

## 4.3 تفعيل الحساب

بعد مراجعة الإدارة أو الحسابات:

- إذا تم قبول الدفع: يتحول الحساب إلى Active.
- إذا تم رفض الدفع: يتحول إلى Payment Rejected مع سبب الرفض.
- إذا كانت الصورة غير واضحة: يتحول إلى Need More Info.

---

## 4.4 تسجيل المعلم

المعلم يفتح صفحة التسجيل ويختار:

```txt
أنا معلم
```

ثم يدخل:

- الاسم.
- الهاتف.
- واتساب.
- البريد الإلكتروني.
- الدولة.
- المؤهلات.
- الخبرة.
- الإجازات إن وجدت.
- اللغات المتاحة للتدريس.
- الأوقات المتاحة.
- رابط أو ملف تعريفي.

حالة حساب المعلم بعد التسجيل:

```txt
Teacher Pending Review
```

بعد موافقة الإدارة:

```txt
Teacher Active
```

---

## 5. لوحة الطالب

## 5.1 Dashboard الطالب

تعرض:

- حالة الحساب.
- الباقة الحالية.
- المعلم الحالي.
- نسبة الحضور.
- عدد الحصص المنفذة.
- عدد الحصص المتبقية.
- عدد الساعات المنفذة.
- آخر تقييم.
- مستوى الحفظ.
- مستوى التجويد.
- الأخطاء المتكررة.
- الحصة القادمة.

### مؤشرات مهمة

```txt
Progress Percentage
Attendance Rate
Memorization Score
Tajweed Score
Fluency Score
Commitment Score
```

---

## 5.2 صفحة الجدول

تعرض للطالب:

- التاريخ.
- الوقت.
- اسم المعلم.
- حالة الحصة.
- رابط Google Meet عند إتاحته.

### حالات الحصة

```txt
Scheduled
Meet Ready
Waiting
Live
Completed
Missed
Cancelled
Rescheduled
```

---

## 5.3 صفحة الدروس والتقدم

كل درس يحتوي على:

- اسم السورة.
- من آية إلى آية.
- نوع الدرس: حفظ / مراجعة / تجويد / اختبار.
- تقييم الحفظ.
- تقييم التجويد.
- تقييم الطلاقة.
- ملاحظات المعلم.
- الأخطاء المحددة للتحسين.

---

## 5.4 صفحة الأخطاء

تقسم الأخطاء إلى:

### أخطاء الحفظ

- نسيان.
- تقديم وتأخير.
- إسقاط آية.
- تكرار غير صحيح.

### أخطاء التجويد

- المدود.
- الغنة.
- أحكام النون الساكنة والتنوين.
- أحكام الميم الساكنة.
- التفخيم والترقيق.
- القلقلة.

### أخطاء القراءة والنطق

- مخارج الحروف.
- صفات الحروف.
- الوقف والابتداء.
- سرعة القراءة.

كل خطأ يحتوي على:

- النوع.
- الوصف.
- السورة والآية.
- عدد مرات التكرار.
- حالة التحسن.

الحالات:

```txt
New
Repeated
Improving
Resolved
```

---

## 5.5 صفحة تغيير الباقة

الطالب يستطيع طلب:

- زيادة عدد الحصص.
- تقليل عدد الحصص.
- زيادة عدد الساعات.
- تقليل عدد الساعات.
- تغيير المواعيد.
- تغيير المعلم.

### Workflow تغيير الباقة

```txt
Student submits request
↓
Teacher reviews and approves/rejects
↓
Admin reviews and approves/rejects
↓
System applies change
↓
Student and teacher receive notification
```

لا يتم تنفيذ التغيير إلا بعد موافقة الإدارة.

---

## 5.6 الشكاوى والاقتراحات

الطالب يفتح تذكرة:

- شكوى من المعلم.
- مشكلة في الجدول.
- مشكلة في الدفع.
- مشكلة تقنية.
- اقتراح تطوير.

حالات التذكرة:

```txt
Open
In Progress
Waiting For User
Resolved
Closed
```

---

## 5.7 إعدادات الطالب

- تعديل الاسم.
- تعديل رقم الهاتف.
- تعديل واتساب.
- تعديل كلمة المرور.
- إعدادات الإشعارات.
- اللغة.
- المنطقة الزمنية.

---

## 6. لوحة المعلم

## 6.1 Dashboard المعلم

تعرض:

- عدد الطلاب الحاليين.
- حصص اليوم.
- الحصص القادمة.
- الحصص المنفذة هذا الشهر.
- نسبة حضور الطلاب.
- متوسط تقييم الطلاب.
- الرصيد الحالي.
- مستحقات قيد المراجعة.

---

## 6.2 صفحة الطلاب

لكل طالب يظهر:

- الاسم.
- المستوى.
- الباقة.
- نسبة الحضور.
- آخر حصة.
- آخر تقييم.
- الأخطاء المتكررة.
- الحالة: نشط / متوقف / متأخر / يحتاج متابعة.

---

## 6.3 صفحة المواعيد

تعرض:

- Calendar يومي وأسبوعي.
- الحصص القادمة.
- حالة كل حصة.
- زر دخول الحصة.
- زر تسجيل نتيجة الحصة.

---

## 6.4 صفحة تسجيل الحصة

بعد الحصة، يسجل المعلم:

- هل حضر الطالب؟
- هل تأخر الطالب؟
- مدة الحصة الفعلية.
- السور والآيات.
- نوع الحصة.
- تقييم الحفظ.
- تقييم التجويد.
- تقييم الطلاقة.
- تقييم الالتزام.
- الأخطاء.
- الملاحظات.
- واجب الحصة القادمة.

### نموذج التقييم المقترح

```txt
Memorization: 40%
Tajweed: 30%
Fluency: 20%
Commitment: 10%
```

---

## 6.5 طلبات تغيير الباقات

المعلم يرى الطلبات الخاصة بطلابه فقط.

يستطيع:

- الموافقة المبدئية.
- الرفض مع السبب.
- اقتراح بديل.

بعدها تنتقل للإدارة.

---

## 6.6 الطلاب الجدد

صفحة اختيار طلاب جدد للمعلم.

تعرض:

- طلاب بدون معلم.
- المستوى.
- الدولة.
- العمر.
- الباقة.
- الأوقات المطلوبة.

المعلم يضغط:

```txt
طلب إضافة الطالب
```

الإدارة توافق أو ترفض.

---

## 6.7 شكاوى المعلم

المعلم يستطيع رفع شكوى ضد طالب بسبب:

- غياب متكرر.
- تأخير متكرر.
- عدم التزام.
- سلوك غير مناسب.
- مشكلة في التواصل.

---

## 6.8 الرصيد والمعاملات

تعرض:

- عدد الحصص المنفذة.
- سعر الحصة أو الساعة.
- إجمالي المستحقات.
- المدفوع.
- المتبقي.
- تاريخ الدفعات.
- الدورة المالية الحالية.

---

## 7. لوحة الإدارة

## 7.1 Dashboard الإدارة

تعرض:

- إجمالي الطلاب.
- الطلاب النشطين.
- الطلاب الموقوفين.
- الطلاب في انتظار التفعيل.
- إجمالي المعلمين.
- المعلمين النشطين.
- حصص اليوم.
- الحصص المباشرة.
- الحصص الفائتة.
- طلبات تغيير الباقات.
- الشكاوى المفتوحة.
- الإيرادات.
- مستحقات المعلمين.

---

## 7.2 إدارة الطلاب

فلترة حسب:

- نشط.
- موقوف.
- في انتظار الدفع.
- في انتظار التفعيل.
- كثير الغياب.
- منخفض التقييم.
- يحتاج متابعة.

صفحة الطالب تحتوي على:

- البيانات الشخصية.
- الباقة.
- المعلم.
- الجدول.
- سجل الحصص.
- الحضور.
- الأخطاء.
- التقييمات.
- المدفوعات.
- الشكاوى.
- Timeline كامل.

---

## 7.3 إدارة المعلمين

فلترة حسب:

- نشط.
- في انتظار المراجعة.
- موقوف.
- عالي التقييم.
- منخفض التقييم.
- كثير الشكاوى.

صفحة المعلم تحتوي على:

- البيانات.
- المؤهلات.
- الطلاب.
- الجدول.
- الحصص المنفذة.
- تقييم الطلاب.
- الشكاوى.
- المستحقات.
- سجل النشاط.

---

## 7.4 إدارة الحصص

تعرض كل الحصص:

- اليوم.
- الأسبوع.
- الشهر.
- حسب الطالب.
- حسب المعلم.
- حسب الحالة.

حالات الحصة:

```txt
Scheduled
Meet Created
Meet Sent
Waiting
Live
Completed
No Show Student
No Show Teacher
Cancelled
Rescheduled
```

---

## 7.5 Live Classes Monitoring

صفحة قوية للإدارة.

تعرض الحصص الحية والقادمة:

- الطالب.
- المعلم.
- وقت البداية.
- حالة الاجتماع.
- هل تم إرسال الرابط؟
- هل دخل الطالب؟
- هل دخل المعلم؟
- زر دخول الاجتماع للمراقبة.

### حالات المراقبة

```txt
Upcoming
Meet Link Ready
Student Joined
Teacher Joined
Live
Finished
```

---

## 7.6 إدارة الباقات

الباقة تحتوي على:

- الاسم.
- عدد الحصص.
- عدد الساعات.
- السعر.
- مدة الاشتراك.
- نوع الباقة.
- هل نشطة؟

أمثلة:

```txt
Basic Package: 8 classes / month
Standard Package: 12 classes / month
Intensive Package: 20 classes / month
Custom Package: manual setup
```

---

## 7.7 طلبات تغيير الباقات

Workflow:

```txt
Created by student
↓
Pending teacher approval
↓
Teacher approved
↓
Pending admin approval
↓
Admin approved
↓
Applied
```

أو:

```txt
Rejected by teacher
Rejected by admin
Cancelled by student
```

الإدارة ترى:

- الطالب.
- المعلم.
- الباقة الحالية.
- الباقة المطلوبة.
- سبب الطلب.
- رأي المعلم.
- القرار النهائي.

---

## 7.8 إدارة الشكاوى

الشكاوى مقسمة إلى:

- شكاوى الطلاب.
- شكاوى المعلمين.
- شكاوى تقنية.
- شكاوى مالية.
- اقتراحات.

كل شكوى لها:

- رقم تذكرة.
- صاحب الشكوى.
- الطرف الآخر إن وجد.
- الأولوية.
- الحالة.
- الموظف المسؤول.
- المرفقات.
- الردود.

---

## 7.9 المالية

تشمل:

### مدفوعات الطلاب

- إثباتات التحويل.
- حالة الدفع.
- المبلغ.
- الباقة.
- تاريخ الدفع.
- من راجع الدفع.

### مستحقات المعلمين

- عدد الحصص.
- سعر الحصة.
- الإجمالي.
- الخصومات إن وجدت.
- المدفوع.
- المتبقي.

### التقارير المالية

- إيرادات اليوم.
- إيرادات الشهر.
- مستحقات المعلمين.
- صافي الربح التقريبي.

---

## 7.10 إعدادات التطبيق

تشمل:

- بيانات الأكاديمية.
- بيانات الدفع.
- إعدادات WhatsApp.
- إعدادات Telegram.
- إعدادات Google Meet.
- إعدادات Google Calendar.
- إعدادات الإشعارات.
- إعدادات المنطقة الزمنية.
- إعدادات اللغة.
- إعدادات الصلاحيات.

---

## 8. Google Meet Integration

## 8.1 الهدف

إنشاء اجتماع Google Meet تلقائياً لكل حصة، وإرسال الرابط للطالب والمعلم قبل موعد الحصة بـ 5 دقائق، مع إظهار الرابط للإدارة للمراقبة.

---

## 8.2 الطريقة الأفضل

يفضل إنشاء Google Calendar Event مع Google Meet Link عند إنشاء الحصة أو تأكيدها، وليس قبلها بخمس دقائق فقط.

السبب:

- تقليل احتمالية فشل إنشاء الرابط قبل الحصة مباشرة.
- تخزين الرابط مبكراً.
- سهولة إرساله وقت الحاجة.
- إمكانية عرضه للإدارة.

لكن لا يتم إظهار الرابط للطالب والمعلم إلا قبل الموعد حسب سياسة النظام.

---

## 8.3 Workflow إنشاء Meet

```txt
Admin/Teacher creates class schedule
↓
System creates Google Calendar event
↓
System requests Google Meet conference link
↓
Meet link is saved in database
↓
5 minutes before class, system sends link to student and teacher
↓
Admin can view and join if needed
```

---

## 8.4 Reminder Job

Cron job يعمل كل دقيقة:

```txt
Find classes starting in 5 minutes
↓
Check if meet_link exists
↓
If exists, send WhatsApp/Telegram notifications
↓
Update class status to Meet Sent
```

---

## 8.5 Admin Monitoring

الإدارة ترى:

- رابط الاجتماع.
- حالة الإرسال.
- وقت الإرسال.
- هل تم إرسال الرابط للطالب؟
- هل تم إرسال الرابط للمعلم؟
- زر دخول الاجتماع.

---

## 8.6 حضور الطالب والمعلم

في V1 يتم الاعتماد على:

- ضغط الطالب على زر دخول الحصة.
- ضغط المعلم على زر دخول الحصة.
- تسجيل المعلم للحضور بعد الحصة.

في V2 يمكن إضافة تتبع أكثر تقدماً إذا كان متاحاً من Google Workspace APIs.

---

## 9. WhatsApp Integration

## 9.1 الاستخدامات

- إرسال رابط الحصة.
- تنبيه قبل الحصة.
- تنبيه بعد تفعيل الحساب.
- تنبيه عند رفض الدفع.
- تنبيه عند طلب معلومات إضافية.
- تنبيه بطلب تغيير الباقة.
- تنبيه للشكاوى.

---

## 9.2 خيارات التنفيذ

### V1 — WhatsApp Click-to-Chat

زر يفتح واتساب مباشرة:

```txt
https://wa.me/<phone>?text=<message>
```

مناسب كبداية بدون تكلفة API.

### V2 — WhatsApp Business API

استخدام مزود مثل:

- Meta WhatsApp Cloud API
- 360dialog
- Twilio
- WATI

---

## 10. Telegram Integration

الاستخدامات:

- إشعار الإدارة بطلب تفعيل جديد.
- إشعار الدعم بشكوى جديدة.
- إشعار المعلم بحصة قادمة.
- إرسال تقارير يومية للإدارة.

التنفيذ:

- Telegram Bot.
- تخزين chat_id لكل مستخدم اختار الربط.
- إرسال الرسائل عبر Bot API.

---

## 11. قاعدة البيانات المقترحة Supabase PostgreSQL

## 11.1 users

```sql
id uuid primary key
email text unique
phone text
whatsapp text
password_hash text
user_type text -- student, teacher, admin
status text
created_at timestamp
updated_at timestamp
```

---

## 11.2 students

```sql
id uuid primary key
user_id uuid references users(id)
full_name text
phone text
whatsapp text
country text
city text
age int
gender text
current_level text
memorized_parts numeric
has_tajweed_experience boolean default false
preferred_times jsonb null      -- الأوقات المفضلة للطالب
timezone text default 'Africa/Cairo'
teacher_id uuid null references teachers(id)
package_id uuid null references packages(id)
status text
created_at timestamp
updated_at timestamp
```

> ملاحظة: `phone`/`whatsapp` تُخزَّن أيضاً على مستوى `users` للمصادقة، لكنها تُكرَّر هنا لأن بيانات التواصل التشغيلية خاصة بالطالب وقد تختلف عن حساب الدخول.

---

## 11.3 teachers

```sql
id uuid primary key
user_id uuid references users(id)
full_name text
phone text
whatsapp text
country text
city text
bio text
qualifications text
experience_years int
ijazat text null               -- الإجازات إن وجدت
languages text[]
availability jsonb null        -- الأوقات المتاحة للتدريس
profile_url text null          -- رابط أو ملف تعريفي
max_students int default 20    -- الحد الأقصى لعدد الطلاب
status text
hourly_rate numeric
per_class_rate numeric null    -- سعر الحصة (بديل/إضافة لسعر الساعة)
created_at timestamp
updated_at timestamp
```

---

## 11.4 admin_users

```sql
id uuid primary key
user_id uuid references users(id)
full_name text
role_id uuid references roles(id)
status text
created_at timestamp
updated_at timestamp
```

---

## 11.5 roles

```sql
id uuid primary key
name text unique
description text
created_at timestamp
updated_at timestamp
```

---

## 11.6 permissions

```sql
id uuid primary key
key text unique
description text
created_at timestamp
```

---

## 11.7 role_permissions

```sql
id uuid primary key
role_id uuid references roles(id)
permission_id uuid references permissions(id)
created_at timestamp
```

---

## 11.8 packages

```sql
id uuid primary key
name text
description text
classes_per_month int
hours_per_month numeric
price numeric
duration_days int
is_active boolean
created_at timestamp
updated_at timestamp
```

---

## 11.9 student_subscriptions

```sql
id uuid primary key
student_id uuid references students(id)
package_id uuid references packages(id)
start_date date
end_date date
status text
classes_total int
classes_used int
hours_total numeric
hours_used numeric
created_at timestamp
updated_at timestamp
```

---

## 11.10 payments

```sql
id uuid primary key
student_id uuid references students(id)
subscription_id uuid references student_subscriptions(id)
amount numeric
payment_method text
transaction_reference text
proof_image_url text
status text
reviewed_by uuid null
reviewed_at timestamp null
rejection_reason text null
created_at timestamp
updated_at timestamp
```

---

## 11.11 classes

```sql
id uuid primary key
student_id uuid references students(id)
teacher_id uuid references teachers(id)
subscription_id uuid references student_subscriptions(id)
start_time timestamp
end_time timestamp
timezone text
status text
google_calendar_event_id text null
meet_link text null
meet_created_at timestamp null
meet_sent_at timestamp null
student_join_clicked_at timestamp null
teacher_join_clicked_at timestamp null
admin_monitor_joined_at timestamp null
created_at timestamp
updated_at timestamp
```

---

## 11.12 lesson_reports

```sql
id uuid primary key
class_id uuid references classes(id)
student_id uuid references students(id)
teacher_id uuid references teachers(id)
lesson_type text -- memorization, revision, tajweed, test
surah_name text
ayah_from int
ayah_to int
memorization_score int
tajweed_score int
fluency_score int
commitment_score int
overall_score int
teacher_notes text
homework text
created_at timestamp
updated_at timestamp
```

---

## 11.13 student_mistakes

```sql
id uuid primary key
student_id uuid references students(id)
lesson_report_id uuid references lesson_reports(id)
mistake_category text -- memorization, tajweed, pronunciation
mistake_type text
surah_name text null
ayah_number int null
description text
severity text -- low, medium, high
status text -- new, repeated, improving, resolved
created_at timestamp
updated_at timestamp
```

---

## 11.14 package_change_requests

```sql
id uuid primary key
student_id uuid references students(id)
teacher_id uuid references teachers(id)
current_package_id uuid references packages(id)
requested_package_id uuid references packages(id)
request_type text
reason text
teacher_status text
teacher_note text
teacher_reviewed_at timestamp null
admin_status text
admin_note text
admin_reviewed_by uuid null
admin_reviewed_at timestamp null
final_status text
created_at timestamp
updated_at timestamp
```

---

## 11.15 complaints

```sql
id uuid primary key
created_by_user_id uuid references users(id)
against_user_id uuid null references users(id)
category text
priority text
status text
subject text
description text
assigned_to uuid null references users(id)
created_at timestamp
updated_at timestamp
closed_at timestamp null
```

---

## 11.16 complaint_messages

```sql
id uuid primary key
complaint_id uuid references complaints(id)
sender_user_id uuid references users(id)
message text
attachment_url text null
created_at timestamp
```

---

## 11.17 teacher_earnings

```sql
id uuid primary key
teacher_id uuid references teachers(id)
class_id uuid references classes(id)
amount numeric
status text -- pending, approved, paid
created_at timestamp
updated_at timestamp
paid_at timestamp null
```

---

## 11.18 teacher_payouts

```sql
id uuid primary key
teacher_id uuid references teachers(id)
amount numeric
status text
payment_method text
reference text
created_at timestamp
paid_at timestamp null
```

---

## 11.19 notifications

```sql
id uuid primary key
user_id uuid references users(id)
channel text -- app, whatsapp, telegram, email
title text
message text
status text -- pending, sent, failed, read
sent_at timestamp null
created_at timestamp
```

---

## 11.20 audit_logs

```sql
id uuid primary key
actor_user_id uuid references users(id)
action text
entity_type text
entity_id uuid
old_value jsonb null
new_value jsonb null
ip_address text null
user_agent text null
created_at timestamp
```

---

## 11.21 student_teacher_requests

طلب المعلم استقبال طالب جديد (قسم 6.6) يحتاج جدولاً مستقلاً يمر على موافقة الإدارة.

```sql
id uuid primary key
teacher_id uuid references teachers(id)
student_id uuid references students(id)
status text            -- pending, admin_approved, admin_rejected, cancelled
admin_note text null
admin_reviewed_by uuid null references users(id)
admin_reviewed_at timestamp null
created_at timestamp
updated_at timestamp
```

---

## 11.22 notification_templates

قوالب موحّدة للرسائل عبر القنوات المختلفة، تدعم متغيرات مثل `{{student_name}}` و `{{meet_link}}`.

```sql
id uuid primary key
key text unique         -- مثال: class_reminder_5min, payment_approved
channel text            -- app, whatsapp, telegram, email
title_ar text
body_ar text            -- نص القالب مع placeholders
is_active boolean default true
created_at timestamp
updated_at timestamp
```

> جدول `notifications` (11.19) يحمل النتيجة الفعلية المُرسلة، بينما `notification_templates` يحمل القالب. يُفضَّل إضافة عمود `template_key text null` إلى `notifications` لتتبع مصدر الرسالة.

---

## 11.23 الفهارس المقترحة Indexes

لأداء أفضل على الاستعلامات المتكررة:

```sql
-- البحث في سجل النشاطات حسب الكيان
create index idx_audit_entity on audit_logs (entity_type, entity_id);
create index idx_audit_actor on audit_logs (actor_user_id, created_at desc);

-- الحصص: جدولة، مراقبة مباشرة، وحصص قادمة
create index idx_classes_start on classes (start_time);
create index idx_classes_teacher_start on classes (teacher_id, start_time);
create index idx_classes_student_start on classes (student_id, start_time);
create index idx_classes_status on classes (status);

-- الأخطاء والتقارير لكل طالب
create index idx_mistakes_student on student_mistakes (student_id, status);
create index idx_reports_student on lesson_reports (student_id, created_at desc);

-- الإشعارات غير المرسلة (لمهام الـ cron)
create index idx_notifications_pending on notifications (status) where status = 'pending';

-- المدفوعات قيد المراجعة
create index idx_payments_status on payments (status);
```

---

## 11.24 ربط Supabase Auth

- جدول `users` يُربط بـ `auth.users` في Supabase: العمود `users.id` يساوي `auth.uid()` (نفس الـ uuid).
- عند التسجيل: يُنشأ سجل في `auth.users` ثم سجل مطابق في `public.users` عبر trigger أو Edge Function.
- كل سياسات RLS تعتمد على `auth.uid()` لمطابقة `users.id`.
- لا تُخزَّن كلمة المرور في `public.users` (Supabase Auth يديرها). يُحذف عمود `password_hash` من 11.1 أو يُترك فارغاً إذا استُخدم Auth.js بدل Supabase Auth — **القرار يُحسم في الأسئلة أدناه**.

---

## 11.25 أمثلة سياسات RLS

RLS مطلوب (قسم 22) لكن بلا أمثلة. نماذج أساسية:

```sql
-- الطالب يرى صفّه فقط
alter table students enable row level security;

create policy "student_reads_own_row"
on students for select
using ( user_id = auth.uid() );

-- المعلم يرى طلابه فقط
create policy "teacher_reads_assigned_students"
on students for select
using (
  teacher_id in (
    select id from teachers where user_id = auth.uid()
  )
);

-- الطالب يرى حصصه فقط
alter table classes enable row level security;

create policy "student_reads_own_classes"
on classes for select
using (
  student_id in (select id from students where user_id = auth.uid())
);

-- الأدوار الإدارية: التحقق عبر دالة مساعدة
create or replace function is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from admin_users
    where user_id = auth.uid() and status = 'Active'
  );
$$;

create policy "admin_full_access_students"
on students for all
using ( is_admin() );
```

> التحقق الدقيق من الصلاحيات (permission keys) يتم في طبقة الخدمة Service Layer، بينما RLS هو خط الدفاع الأخير على مستوى قاعدة البيانات.

---

## 12. الصفحات المطلوبة

## 12.1 Public Pages

- الصفحة الرئيسية.
- صفحة الباقات.
- صفحة تسجيل الطالب.
- صفحة تسجيل المعلم.
- صفحة تسجيل الدخول.
- صفحة نسيت كلمة المرور.

---

## 12.2 Student Dashboard Pages

- /student/dashboard
- /student/schedule
- /student/lessons
- /student/mistakes
- /student/package
- /student/complaints
- /student/payment
- /student/settings

---

## 12.3 Teacher Dashboard Pages

- /teacher/dashboard
- /teacher/students
- /teacher/schedule
- /teacher/classes/[id]/report
- /teacher/package-requests
- /teacher/new-students
- /teacher/complaints
- /teacher/finance
- /teacher/settings

---

## 12.4 Admin Dashboard Pages

- /admin/dashboard
- /admin/students
- /admin/students/[id]
- /admin/teachers
- /admin/teachers/[id]
- /admin/classes
- /admin/live-classes
- /admin/packages
- /admin/package-requests
- /admin/payments
- /admin/complaints
- /admin/finance
- /admin/roles
- /admin/admin-users
- /admin/settings
- /admin/audit-logs

---

## 13. API Contracts

## 13.1 Auth

```http
POST /api/auth/register/student
POST /api/auth/register/teacher
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/forgot-password
POST /api/auth/reset-password
```

---

## 13.2 Payments

```http
POST /api/payments/upload-proof
GET /api/admin/payments
POST /api/admin/payments/:id/approve
POST /api/admin/payments/:id/reject
```

---

## 13.3 Classes

```http
GET /api/student/classes
GET /api/teacher/classes
GET /api/admin/classes
POST /api/admin/classes
PATCH /api/admin/classes/:id
POST /api/classes/:id/join
POST /api/classes/:id/create-meet
POST /api/classes/:id/send-meet-link
```

---

## 13.4 Lesson Reports

```http
POST /api/teacher/classes/:id/report
GET /api/student/lesson-reports
GET /api/admin/students/:id/lesson-reports
```

---

## 13.5 Mistakes

```http
POST /api/teacher/lesson-reports/:id/mistakes
GET /api/student/mistakes
GET /api/admin/students/:id/mistakes
PATCH /api/teacher/mistakes/:id
```

---

## 13.6 Package Change Requests

```http
POST /api/student/package-change-requests
GET /api/teacher/package-change-requests
POST /api/teacher/package-change-requests/:id/approve
POST /api/teacher/package-change-requests/:id/reject
GET /api/admin/package-change-requests
POST /api/admin/package-change-requests/:id/approve
POST /api/admin/package-change-requests/:id/reject
```

---

## 13.7 Complaints

```http
POST /api/complaints
GET /api/complaints
GET /api/complaints/:id
POST /api/complaints/:id/messages
PATCH /api/admin/complaints/:id/status
PATCH /api/admin/complaints/:id/assign
```

---

## 13.8 New Student Requests (طلب المعلم استقبال طالب)

```http
GET  /api/teacher/available-students
POST /api/teacher/student-requests
GET  /api/admin/student-requests
POST /api/admin/student-requests/:id/approve
POST /api/admin/student-requests/:id/reject
```

---

## 13.9 Admin Users & Roles

```http
GET /api/admin/roles
POST /api/admin/roles
PATCH /api/admin/roles/:id
GET /api/admin/permissions
POST /api/admin/admin-users
PATCH /api/admin/admin-users/:id
```

---

## 14. Tech Stack مقترح

## 14.1 Frontend

- Next.js App Router
- TypeScript
- Tailwind CSS (مع RTL افتراضي — عربي فقط في V1)
- خط ثمانية Thmanyah عبر `next/font/local` (انظر 25.1)
- Shadcn UI (مع ضبط الاتجاه RTL والألوان حسب 25.2)
- React Hook Form
- Zod Validation
- TanStack Query
- Zustand أو Jotai للحالة البسيطة

---

## 14.2 Backend

- Next.js API Routes أو Hono API
- **Supabase self-hosted عبر Docker محلياً** (Supabase CLI: `supabase start`) — PostgreSQL 17
- Supabase Auth (المصادقة)
- Supabase Storage لإثباتات الدفع والمرفقات
- Row Level Security
- الإنتاج لاحقاً: نفس الـ stack إمّا self-hosted على VPS أو الترقية لمشروع Supabase سحابي

> منافذ التطوير المحلي: API `54321` · DB `54322` · Studio `54323` · بريد تجريبي (Inbucket) `54324`.

---

## 14.3 Jobs & Queue

لأن النظام يحتاج مهام مجدولة:

- إرسال روابط الحصص قبل الموعد.
- إنشاء اجتماعات.
- إرسال إشعارات.
- تقارير يومية.

الخيارات:

### خيار بسيط

- Vercel Cron Jobs
- Supabase Edge Functions

### خيار أقوى

- Trigger.dev
- Inngest
- Upstash QStash

### خيار احترافي

- Worker منفصل على VPS
- BullMQ + Redis

---

## 14.4 Integrations

- Google Calendar API
- Google Meet عبر Calendar Conference Data
- WhatsApp Click-to-Chat في V1
- WhatsApp Cloud API في V2
- Telegram Bot API
- Email Provider مثل Resend

---

## 15. Folder Structure

```txt
/src
  /app
    /(public)
      /page.tsx
      /login
      /register/student
      /register/teacher
    /(student)
      /student/dashboard
      /student/schedule
      /student/lessons
      /student/mistakes
      /student/package
      /student/complaints
      /student/payment
      /student/settings
    /(teacher)
      /teacher/dashboard
      /teacher/students
      /teacher/schedule
      /teacher/package-requests
      /teacher/new-students
      /teacher/complaints
      /teacher/finance
      /teacher/settings
    /(admin)
      /admin/dashboard
      /admin/students
      /admin/teachers
      /admin/classes
      /admin/live-classes
      /admin/packages
      /admin/package-requests
      /admin/payments
      /admin/complaints
      /admin/finance
      /admin/roles
      /admin/settings
  /components
    /ui
    /forms
    /dashboard
    /tables
    /charts
    /calendar
  /features
    /auth
    /students
    /teachers
    /classes
    /lessons
    /payments
    /packages
    /complaints
    /finance
    /notifications
    /rbac
  /lib
    /supabase
    /google
    /whatsapp
    /telegram
    /permissions
    /validators
  /server
    /services
    /jobs
    /repositories
  /types
```

---

## 16. أهم الـ Services

## 16.1 AuthService

مسؤول عن:

- تسجيل الطالب.
- تسجيل المعلم.
- تسجيل الدخول.
- إدارة حالة الحساب.

---

## 16.2 PaymentService

مسؤول عن:

- رفع إثبات الدفع.
- مراجعة الدفع.
- تفعيل الطالب.
- تسجيل Audit Log.

---

## 16.3 ClassService

مسؤول عن:

- إنشاء الحصص.
- إعادة الجدولة.
- تحديث الحالة.
- إنشاء Google Meet.
- إرسال رابط الحصة.

---

## 16.4 GoogleMeetService

مسؤول عن:

- إنشاء Google Calendar Event.
- إضافة conferenceData.
- استخراج meet_link.
- حفظ event_id و meet_link.

---

## 16.5 NotificationService

مسؤول عن:

- إشعارات داخل التطبيق.
- واتساب.
- تيليجرام.
- إيميل.

---

## 16.6 LessonReportService

مسؤول عن:

- حفظ تقرير الحصة.
- حساب التقييم العام.
- تحديث تقدم الطالب.
- إضافة الأخطاء.

---

## 16.7 PackageRequestService

مسؤول عن:

- إنشاء طلب تغيير الباقة.
- موافقة المعلم.
- موافقة الإدارة.
- تطبيق التغيير.

---

## 16.8 FinanceService

مسؤول عن:

- حساب مستحقات المعلمين.
- إدارة المدفوعات.
- إدارة دورات الدفع.
- تقارير الإيرادات.

---

## 17. Cron Jobs

## 17.1 send-class-reminders

يعمل كل دقيقة.

```txt
Find classes starting in 5 minutes
If meet link exists and not sent
Send link to student and teacher
Notify admin if sending failed
Update class status
```

---

## 17.2 create-missing-meet-links

يعمل كل 10 دقائق.

```txt
Find upcoming classes without meet link
Create Google Meet link
Save link
```

---

## 17.3 daily-admin-report

يعمل يومياً.

يرسل للإدارة:

- عدد حصص اليوم.
- الحصص الفائتة.
- الشكاوى الجديدة.
- طلبات التفعيل.
- طلبات تغيير الباقات.

---

## 17.4 teacher-earnings-calculation

يعمل يومياً أو بعد كل حصة مكتملة.

```txt
For each completed class
If earning not created
Create teacher earning record
```

---

## 18. حالات الحسابات

## 18.1 Student Status

```txt
Pending Payment
Payment Under Review
Active
Suspended
Cancelled
Payment Rejected
```

---

## 18.2 Teacher Status

```txt
Pending Review
Active
Suspended
Rejected
```

---

## 18.3 Admin User Status

```txt
Active
Disabled
```

---

## 19. حالات الحصة (المرجع الموحّد)

هذا هو enum الرسمي المعتمد. أي قائمة سابقة في القسمين 5.2 و7.4 تتبع هذا التعريف، و `No Show Student/Teacher` تحل محل `Missed` للتفريق بين غياب الطرفين:

```txt
scheduled        -- تم إنشاء الحصة
meet_created     -- تم إنشاء رابط Google Meet وحفظه
meet_sent        -- تم إرسال الرابط للطالب والمعلم
waiting          -- حان الوقت وبانتظار الدخول
live             -- الحصة جارية
completed         -- اكتملت وسُجّل التقرير
no_show_student  -- لم يحضر الطالب
no_show_teacher  -- لم يحضر المعلم
cancelled        -- أُلغيت
rescheduled      -- أُعيدت جدولتها
```

> القيم تُخزَّن بصيغة snake_case في قاعدة البيانات، وتُترجم للعرض في الواجهة العربية.

---

## 20. التقارير المطلوبة

## 20.1 تقارير الطالب

- تقرير الحضور.
- تقرير التقدم.
- تقرير الأخطاء.
- تقرير الحفظ.
- تقرير التجويد.
- تقرير الالتزام.

---

## 20.2 تقارير المعلم

- عدد الطلاب.
- عدد الحصص.
- نسبة حضور الطلاب.
- تقييم الطلاب للمعلم.
- الشكاوى.
- المستحقات.

---

## 20.3 تقارير الإدارة

- الطلاب النشطون.
- الطلاب المتوقفون.
- المعلمون النشطون.
- الحصص اليومية.
- الحصص الفائتة.
- الإيرادات.
- مستحقات المعلمين.
- طلبات التفعيل.
- طلبات تغيير الباقات.
- الشكاوى المفتوحة.

---

## 21. نظام الإشعارات

## 21.1 إشعارات الطالب

- تم إنشاء الحساب.
- في انتظار الدفع.
- تم استلام إثبات الدفع.
- تم تفعيل الحساب.
- تم رفض الدفع.
- الحصة تبدأ بعد 5 دقائق.
- تم تغيير الباقة.
- تم الرد على الشكوى.

---

## 21.2 إشعارات المعلم

- تم اعتماد حسابك.
- لديك حصة بعد 5 دقائق.
- طالب جديد تم تعيينه لك.
- طلب تغيير باقة من طالب.
- شكوى جديدة تحتاج رد.
- تم اعتماد مستحقاتك.

---

## 21.3 إشعارات الإدارة

- طلب تفعيل جديد.
- إثبات دفع جديد.
- شكوى جديدة.
- حصة لم تبدأ في موعدها.
- معلم لم يدخل الحصة.
- طالب كثير الغياب.
- طلب تغيير باقة جديد.

---

## 22. Security Requirements

- تشفير كلمات المرور.
- Row Level Security في Supabase.
- منع الطالب من رؤية بيانات طلاب آخرين.
- منع المعلم من رؤية طلاب خارج قائمته.
- Audit Logs لأي تعديل إداري.
- حماية روابط الملفات.
- صلاحيات دقيقة للموظفين.
- Rate limiting على تسجيل الدخول.
- التحقق من نوع وحجم ملفات إثبات الدفع.

---

## 23. MVP Scope

## المرحلة الأولى V1

الهدف: تشغيل الأكاديمية بأقل نسخة قوية وقابلة للاستخدام.

تشمل:

- تسجيل الطالب.
- تسجيل المعلم.
- رفع إثبات الدفع.
- تفعيل الحساب من الإدارة.
- إدارة الطلاب.
- إدارة المعلمين.
- إدارة الحصص.
- إنشاء Google Meet.
- إرسال رابط الحصة.
- تسجيل تقرير الحصة.
- تسجيل الأخطاء.
- طلب تغيير الباقة.
- موافقة المعلم والإدارة.
- الشكاوى.
- صلاحيات أساسية.

---

## المرحلة الثانية V2

تشمل:

- المالية المتقدمة.
- مستحقات المعلمين.
- Telegram Bot.
- WhatsApp API.
- تقييم الطالب للمعلم.
- تقييم المعلم للطالب.
- Live Classes Monitoring.
- تقارير متقدمة.

---

## المرحلة الثالثة V3

تشمل:

- CRM للمتقدمين الجدد.
- اختبار تحديد المستوى.
- خطط حفظ تلقائية.
- AI Progress Analysis.
- اقتراح تكثيف أو تقليل الباقة.
- Gamification.
- حافظ الأسبوع.
- تنبيهات ذكية للطلاب المعرضين للتوقف.

---

## 24. AI Features مستقبلية

## 24.1 تحليل أداء الطالب

النظام يحلل:

- نسبة الحضور.
- الأخطاء المتكررة.
- سرعة الحفظ.
- مستوى التجويد.
- الالتزام بالواجب.

ثم يقترح:

- زيادة المراجعة.
- تقليل كمية الحفظ.
- تكثيف الحصص.
- تغيير المعلم إن لزم.

---

## 24.2 تنبيهات الانسحاب

النظام يكتشف الطلاب المعرضين للانسحاب بناءً على:

- الغياب المتكرر.
- انخفاض التقييم.
- عدم فتح المنصة.
- كثرة الشكاوى.
- تأخير الدفع.

---

## 24.3 توصية خطة حفظ

بناءً على مستوى الطالب:

- مبتدئ.
- متوسط.
- متقدم.

النظام يقترح:

- عدد الحصص.
- كمية الحفظ.
- كمية المراجعة.
- اختبار شهري.

---

## 25. Design Direction (هوية مستوحاة من ثمانية)

هوية المنصة يجب أن تكون:

- عربية بالكامل (الإصدار الأول عربي فقط، RTL افتراضي).
- هادئة وتحريرية (editorial) على نمط منصة ثمانية.
- موثوقة وراقية، إسلامية بدون مبالغة زخرفية.
- مناسبة للطلاب وأولياء الأمور والمعلمين.

### 25.1 خط ثمانية Thmanyah Typeface

نستخدم عائلة خط ثمانية الرسمية (موجودة في `E:\Tools\Thmanyah-Font-Family.zip`)، وتضم 3 عائلات بأوزان Light / Regular / Medium / Bold / Black وبصيغتي `woff2` و `otf`:

| العائلة | الاستخدام |
| --- | --- |
| **Thmanyah Sans** | النصوص العامة، الواجهات، الأزرار، الجداول (الخط الأساسي). |
| **Thmanyah Serif Display** | العناوين الكبيرة والهيرو (Display). |
| **Thmanyah Serif Text** | الفقرات الطويلة والمحتوى التحريري عند الحاجة. |

التنفيذ في Next.js عبر `next/font/local` مع تحميل صيغة `woff2` فقط للأداء:

```ts
// src/lib/fonts.ts
import localFont from 'next/font/local'

export const thmanyahSans = localFont({
  variable: '--font-sans',
  display: 'swap',
  src: [
    { path: '../fonts/thmanyahsans-Light.woff2',   weight: '300', style: 'normal' },
    { path: '../fonts/thmanyahsans-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/thmanyahsans-Medium.woff2',  weight: '500', style: 'normal' },
    { path: '../fonts/thmanyahsans-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/thmanyahsans-Black.woff2',   weight: '900', style: 'normal' },
  ],
})

export const thmanyahDisplay = localFont({
  variable: '--font-display',
  display: 'swap',
  src: [
    { path: '../fonts/thmanyahserifdisplay-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../fonts/thmanyahserifdisplay-Bold.woff2',    weight: '700', style: 'normal' },
    { path: '../fonts/thmanyahserifdisplay-Black.woff2',   weight: '900', style: 'normal' },
  ],
})
```

> ملاحظة ترخيص: ملف `ترخيص خط ثمانية.pdf` و `LICENSE.pdf` مرفقان في حزمة الخط — يجب مراجعة شروط الاستخدام التجاري قبل النشر.

### 25.2 لوحة الألوان — Emerald + Gold + Ivory (Modern Islamic Education)

الهوية: **Premium Quran Academy** — موثوقة، حديثة، إسلامية بدون مبالغة. الأخضر = القرآن والنمو، الذهبي = التميّز والإجازة، العاجي = الهدوء. (الخط يبقى **ثمانية** ثابتاً.)

```txt
-- الأساسي (Brand — Emerald)
Brand / Primary:    #0F6B52
Brand Hover:        #0A5440
Brand Subtle:       #E6F0EC

-- الثانوي (Gold)
Gold:               #C9A227
Gold Hover:         #B08E1F
Gold Subtle:        #F7EFD6

-- الوضع الفاتح (Ivory)
Background:          #FAF8F2
Surface / Card:      #FFFFFF
Border:              #E9E4D8
Text Primary:        #1B1B1B
Text Secondary:      #6B6B6B

-- الوضع الداكن (Dark green-black)
Brand:               #2BA77E   (زمردي أفتح للتباين)
Gold:                #D9B23A
Background:          #0E1411
Surface / Card:      #161D19
Border:              #25302A
Text Primary:        #F3F4F2
Text Secondary:      #9BA7A0

-- ألوان الحالة (Semantic) + حالات الطالب
Success / ممتاز:     #22C55E
Info / جيد:          #2563EB
Warning / يحتاج تحسين:#F59E0B
Danger / متعثر:      #DC2626
```

تُعرَّف كلها كـ CSS variables / Tailwind v4 theme tokens (`src/app/globals.css`) ليسهل التبديل بين الوضعين.

### 25.3 الهوية اللفظية والاسم

- اسم البراند: **الحفظة | Huffaz** — الشعار النصي «الحفظة» وتحته «لتحفيظ وتعليم القرآن الكريم».
- العلامة (logo): محراب هندسي + مصحف مفتوح + هلال ذهبي (`src/components/brand/logo.tsx`)، minimal.
- النبرة: «رحلة منظمة لحفظ القرآن الكريم بإشراف معلمين متخصصين وتقارير متابعة دقيقة».

### 25.4 مبادئ الواجهة

- مساحات واسعة، حدود رفيعة، زوايا ناعمة (`rounded-2xl`).
- الأخضر للأزرار الأساسية، الذهبي للأزرار/الشارات الثانوية وإبراز الباقة المميّزة.
- أيقونات **outline** (نمط Lucide/Heroicons) لا أيقونات إسلامية مزخرفة.
- بطاقات Dashboard بأرقام كبيرة بخط Display، أرقام عربية، RTL افتراضي.
- المرجع البصري: زاد / رواق / إدراك / Coursera (لا صفحات التحفيظ التقليدية).

---

## 26. Prioritized Build Order

الترتيب الصحيح للتنفيذ:

1. Database Schema.
2. Authentication.
3. Roles & Permissions.
4. Student Registration.
5. Teacher Registration.
6. Admin Dashboard Basic.
7. Payment Proof Upload.
8. Payment Review & Activation.
9. Packages.
10. Class Scheduling.
11. Google Meet Creation.
12. Class Reminder Notifications.
13. Student Dashboard.
14. Teacher Dashboard.
15. Lesson Reports.
16. Mistakes Tracking.
17. Package Change Requests.
18. Complaints.
19. Finance.
20. Advanced Reports.

---

## 27. أهم قرارات معمارية

### 27.1 لا تربط تفعيل الطالب بواتساب فقط

واتساب جيد للتواصل، لكن إثبات الدفع يجب أن يرفع داخل النظام حتى يكون هناك سجل رسمي.

---

### 27.2 أنشئ Meet Link مبكراً

لا تنتظر آخر 5 دقائق لإنشاء الاجتماع. الأفضل إنشاؤه عند جدولة الحصة، ثم إرساله قبل الحصة بـ 5 دقائق.

---

### 27.3 اجعل الإدارة هي الموافقة النهائية

أي تغيير في الباقة أو المعلم أو الجدول يجب أن يمر على الإدارة.

---

### 27.4 سجل كل شيء

أي تعديل إداري يجب أن يدخل في audit_logs.

---

### 27.5 ابدأ بـ V1 قوية لا ضخمة

لا تبدأ بكل الميزات دفعة واحدة. ابدأ بتشغيل كامل للحصص والتفعيل والتقارير الأساسية.

---

## 28. Definition of Done للنسخة الأولى

تعتبر V1 جاهزة إذا كان يمكن تنفيذ السيناريو التالي بالكامل:

1. طالب يسجل حساب.
2. يرفع إثبات الدفع.
3. الإدارة توافق.
4. الطالب يصبح Active.
5. الإدارة تعين له معلم وباقة.
6. يتم إنشاء جدول حصص.
7. النظام ينشئ Google Meet.
8. قبل الحصة يتم إرسال الرابط.
9. الطالب والمعلم يدخلان الحصة.
10. المعلم يسجل تقرير الحصة.
11. الطالب يرى التقدم والأخطاء.
12. الطالب يطلب تغيير باقة.
13. المعلم يوافق.
14. الإدارة توافق.
15. النظام يطبق التغيير.
16. الإدارة ترى كل التقارير.

---

## 29. توصية التنفيذ

أفضل تنفيذ للمشروع:

```txt
Next.js + Supabase + Google Calendar API + Telegram Bot + WhatsApp Click-to-Chat initially
```

ثم بعد إثبات التشغيل:

```txt
Add WhatsApp Business API + Advanced Finance + AI Progress Analysis
```

التركيز الأول يجب أن يكون على:

- التفعيل المالي.
- الجدولة.
- Google Meet.
- تقارير الحصة.
- متابعة الأخطاء.
- صلاحيات الإدارة.

لأن هذه هي العناصر التي تجعل الأكاديمية قابلة للتوسع فعلياً.
