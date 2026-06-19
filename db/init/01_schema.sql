-- =====================================================================
-- أكاديمية الحفظة — المخطط الكامل (Postgres مباشر، بدون Supabase)
-- التحكم بالوصول في طبقة التطبيق. المصادقة عبر password_hash + JWT.
-- =====================================================================

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---- users ----
create table users (
  id            uuid primary key default gen_random_uuid(),
  email         text unique not null,
  password_hash text not null,
  phone         text,
  whatsapp      text,
  telegram_chat_id   text,
  telegram_link_code text,
  user_type     text not null check (user_type in ('student','teacher','admin')),
  status        text not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create trigger trg_users_updated before update on users for each row execute function set_updated_at();

-- ---- roles / permissions ----
create table roles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_roles_updated before update on roles for each row execute function set_updated_at();

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text unique not null,
  description text,
  created_at timestamptz not null default now()
);

create table role_permissions (
  id uuid primary key default gen_random_uuid(),
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (role_id, permission_id)
);

create table admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade unique,
  full_name text not null,
  role_id uuid references roles(id),
  status text not null default 'Active' check (status in ('Active','Disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_admin_users_updated before update on admin_users for each row execute function set_updated_at();

-- ---- teachers ----
create table teachers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null,
  phone text, whatsapp text, country text, city text,
  bio text, qualifications text, experience_years int,
  ijazat text, languages text[] default '{}', availability jsonb,
  profile_url text, max_students int default 20,
  status text not null default 'Pending Review' check (status in ('Pending Review','Active','Suspended','Rejected')),
  per_class_rate numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_teachers_updated before update on teachers for each row execute function set_updated_at();

-- ---- packages ----
create table packages (
  id uuid primary key default gen_random_uuid(),
  name text not null, description text,
  classes_per_month int, hours_per_month numeric,
  price numeric not null default 0, currency text not null default 'EGP',
  duration_days int, type text, is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_packages_updated before update on packages for each row execute function set_updated_at();

-- ---- students ----
create table students (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  full_name text not null, phone text, whatsapp text,
  country text, city text, age int, gender text,
  current_level text, memorized_parts numeric default 0,
  has_tajweed_experience boolean default false,
  preferred_times jsonb, timezone text default 'Africa/Cairo',
  teacher_id uuid references teachers(id) on delete set null,
  package_id uuid references packages(id) on delete set null,
  status text not null default 'Pending Payment'
    check (status in ('Pending Payment','Payment Under Review','Active','Suspended','Cancelled','Payment Rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_students_updated before update on students for each row execute function set_updated_at();

-- ---- subscriptions ----
create table student_subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  package_id uuid not null references packages(id),
  start_date date, end_date date, status text not null default 'active',
  classes_total int default 0, classes_used int default 0,
  hours_total numeric default 0, hours_used numeric default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_subs_updated before update on student_subscriptions for each row execute function set_updated_at();

-- ---- payments ----
create table payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  subscription_id uuid references student_subscriptions(id) on delete set null,
  amount numeric not null default 0, currency text not null default 'EGP',
  payment_method text, transaction_reference text, proof_image_url text,
  status text not null default 'Pending Payment'
    check (status in ('Pending Payment','Payment Uploaded','Payment Under Review','Payment Approved','Payment Rejected','Need More Info')),
  reviewed_by uuid references users(id), reviewed_at timestamptz, rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_payments_updated before update on payments for each row execute function set_updated_at();

-- ---- classes ----
create table classes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  subscription_id uuid references student_subscriptions(id) on delete set null,
  start_time timestamptz not null, end_time timestamptz, timezone text default 'Africa/Cairo',
  status text not null default 'scheduled'
    check (status in ('scheduled','meet_created','meet_sent','waiting','live','completed','no_show_student','no_show_teacher','cancelled','rescheduled')),
  google_calendar_event_id text, meet_link text, meet_created_at timestamptz, meet_sent_at timestamptz,
  student_join_clicked_at timestamptz, teacher_join_clicked_at timestamptz, admin_monitor_joined_at timestamptz,
  -- غرفة المصحف المباشرة: الصفحة التي يعرضها المعلم ليتابعها الطالب أثناء الحصة + حضور لحظي
  live_page int, live_updated_at timestamptz,
  live_teacher_seen_at timestamptz, live_student_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_classes_updated before update on classes for each row execute function set_updated_at();

-- ---- lesson_reports ----
create table lesson_reports (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  lesson_type text check (lesson_type in ('memorization','revision','tajweed','test')),
  surah_name text, ayah_from int, ayah_to int,
  memorization_score int check (memorization_score between 0 and 100),
  tajweed_score int check (tajweed_score between 0 and 100),
  fluency_score int check (fluency_score between 0 and 100),
  commitment_score int check (commitment_score between 0 and 100),
  overall_score int check (overall_score between 0 and 100),
  teacher_notes text, homework text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_reports_updated before update on lesson_reports for each row execute function set_updated_at();

-- ---- student_mistakes ----
create table student_mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  lesson_report_id uuid references lesson_reports(id) on delete set null,
  mistake_category text check (mistake_category in ('memorization','tajweed','pronunciation')),
  mistake_type text, surah_name text, ayah_number int, description text,
  severity text check (severity in ('low','medium','high')),
  status text not null default 'new' check (status in ('new','repeated','improving','resolved')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_mistakes_updated before update on student_mistakes for each row execute function set_updated_at();

-- ---- package_change_requests ----
create table package_change_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid references teachers(id) on delete set null,
  current_package_id uuid references packages(id),
  requested_package_id uuid references packages(id),
  request_type text, reason text,
  teacher_status text default 'pending', teacher_note text, teacher_reviewed_at timestamptz,
  admin_status text default 'pending', admin_note text,
  admin_reviewed_by uuid references users(id), admin_reviewed_at timestamptz,
  final_status text default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_pkgreq_updated before update on package_change_requests for each row execute function set_updated_at();

-- ---- student_teacher_requests ----
create table student_teacher_requests (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','admin_approved','admin_rejected','cancelled')),
  admin_note text, admin_reviewed_by uuid references users(id), admin_reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_streq_updated before update on student_teacher_requests for each row execute function set_updated_at();

-- ---- complaints ----
create table complaints (
  id uuid primary key default gen_random_uuid(),
  created_by_user_id uuid not null references users(id) on delete cascade,
  against_user_id uuid references users(id) on delete set null,
  category text, priority text default 'medium' check (priority in ('low','medium','high','urgent')),
  status text not null default 'Open' check (status in ('Open','In Progress','Waiting For User','Resolved','Closed')),
  subject text, description text,
  assigned_to uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create trigger trg_complaints_updated before update on complaints for each row execute function set_updated_at();

create table complaint_messages (
  id uuid primary key default gen_random_uuid(),
  complaint_id uuid not null references complaints(id) on delete cascade,
  sender_user_id uuid not null references users(id) on delete cascade,
  message text not null, attachment_url text,
  created_at timestamptz not null default now()
);

-- ---- finance ----
create table teacher_earnings (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  class_id uuid references classes(id) on delete set null unique,
  amount numeric not null default 0, currency text not null default 'EGP',
  status text not null default 'pending' check (status in ('pending','approved','paid')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at timestamptz
);
create trigger trg_earnings_updated before update on teacher_earnings for each row execute function set_updated_at();

create table teacher_payouts (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  amount numeric not null default 0, currency text not null default 'EGP',
  status text not null default 'pending', payment_method text, reference text,
  created_at timestamptz not null default now(), paid_at timestamptz
);

-- ---- notifications ----
create table notification_templates (
  id uuid primary key default gen_random_uuid(),
  key text unique not null, channel text not null check (channel in ('app','whatsapp','telegram','email')),
  title_ar text, body_ar text not null, is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_templates_updated before update on notification_templates for each row execute function set_updated_at();

create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  channel text not null check (channel in ('app','whatsapp','telegram','email')),
  template_key text references notification_templates(key) on delete set null,
  title text, message text,
  status text not null default 'pending' check (status in ('pending','sent','failed','read')),
  sent_at timestamptz, created_at timestamptz not null default now()
);

-- ---- audit_logs ----
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references users(id) on delete set null,
  action text not null, entity_type text not null, entity_id uuid,
  old_value jsonb, new_value jsonb, ip_address text, user_agent text,
  created_at timestamptz not null default now()
);

-- ---- recurring_slots (قوالب التوفّر الأسبوعي المتكرر) ----
create table recurring_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0=الأحد .. 6=السبت (JS getDay)
  time_of_day text not null,                                -- 'HH:MM'
  duration_minutes int not null default 45,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index idx_recurring_slots_teacher on recurring_slots (teacher_id) where active;

-- ---- class_slots (أوقات المعلم المتاحة للحجز الذاتي) ----
create table class_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  start_time timestamptz not null,
  duration_minutes int not null default 45,
  status text not null default 'open' check (status in ('open','booked','cancelled')),
  booked_class_id uuid references classes(id) on delete set null,
  recurring_id uuid references recurring_slots(id) on delete set null,
  created_at timestamptz not null default now()
);
create index idx_class_slots_teacher on class_slots (teacher_id, start_time);
create index idx_class_slots_open on class_slots (status, start_time) where status = 'open';

-- ---- password resets (روابط استرجاع كلمة المرور) ----
create table password_resets (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  used boolean not null default false,
  created_at timestamptz not null default now()
);
create index idx_password_resets_user on password_resets (user_id);

-- ---- login throttle (حماية من تخمين كلمة المرور) ----
create table login_throttle (
  email text primary key,
  fail_count int not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

-- ---- indexes ----
create index idx_audit_entity on audit_logs (entity_type, entity_id);
create index idx_audit_actor on audit_logs (actor_user_id, created_at desc);
create index idx_classes_start on classes (start_time);
create index idx_classes_teacher_start on classes (teacher_id, start_time);
create index idx_classes_student_start on classes (student_id, start_time);
create index idx_classes_status on classes (status);
create index idx_mistakes_student on student_mistakes (student_id, status);
create index idx_reports_student on lesson_reports (student_id, created_at desc);
create index idx_reports_class on lesson_reports (class_id);
create index idx_notifications_pending on notifications (status) where status = 'pending';
create index idx_payments_status on payments (status);
create index idx_students_teacher on students (teacher_id);
create index idx_students_status on students (status);
create index idx_students_user on students (user_id);
create index idx_teachers_status on teachers (status);
create index idx_teachers_user on teachers (user_id);

-- ---- حدود طول النصوص الحرة (حماية من إدخال غير محدود) ----
alter table students           add constraint chk_students_name_len   check (char_length(full_name) <= 120);
alter table teachers           add constraint chk_teachers_name_len   check (char_length(full_name) <= 120);
alter table teachers           add constraint chk_teachers_bio_len    check (bio is null or char_length(bio) <= 3000);
alter table admin_users        add constraint chk_admin_name_len      check (char_length(full_name) <= 120);
alter table complaints         add constraint chk_complaint_subj_len  check (char_length(subject) <= 200);
alter table complaints         add constraint chk_complaint_desc_len  check (description is null or char_length(description) <= 5000);
alter table complaint_messages add constraint chk_cmsg_len            check (char_length(message) <= 5000);
alter table payments           add constraint chk_payment_ref_len     check (transaction_reference is null or char_length(transaction_reference) <= 120);
alter table student_mistakes   add constraint chk_mistake_desc_len    check (description is null or char_length(description) <= 2000);

-- ================== المصحف الشخصي للطالب ==================
-- نص القرآن العثماني (يُبذَر من db/seed/quran.json عبر scripts/seed-quran.mjs)
create table quran_surahs (
  number int primary key,
  name_ar text not null,
  name_en text,
  ayah_count int not null,
  revelation text
);
create table quran_ayahs (
  surah_number int not null references quran_surahs(number) on delete cascade,
  ayah_number int not null,
  juz_number int,
  page_number int,
  text text not null,
  primary key (surah_number, ayah_number)
);
create index idx_quran_ayahs_page on quran_ayahs (page_number);
create index idx_quran_ayahs_juz on quran_ayahs (juz_number);

-- تخطيط مصحف المدينة: كلمة لكل سطر (يُبذَر من db/seed/quran-layout.json عبر scripts/seed-quran-layout.mjs)
create table quran_words (
  id bigserial primary key,
  page_number int not null,
  line_number int not null,
  surah_number int not null,
  ayah_number int not null,
  position int not null,           -- ترتيب الكلمة داخل الآية (1-based)
  is_end boolean not null default false, -- علامة نهاية الآية
  seq int not null,                -- ترتيب الكلمة داخل الصفحة (للفرز)
  text text not null default '',
  code_v2 text not null default '', -- رمز الكلمة في خط QCF v2 (للعرض المصحفي الدقيق)
  v2_page int not null default 0    -- رقم خط الصفحة المقابل في QCF v2
);
create index idx_quran_words_page on quran_words (page_number, seq);

-- القرّاء (مجلدات everyayah.com تُبنى منها روابط الصوت)
create table reciters (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text,
  source text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- آخر موضع وصل إليه الطالب (يحدّده المعلم) — صف واحد لكل طالب
create table student_mushaf_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade unique,
  teacher_id uuid references teachers(id),
  surah_number int not null,
  ayah_number int not null,
  word_index int,
  page_number int,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger trg_mushaf_progress_updated before update on student_mushaf_progress for each row execute function set_updated_at();

-- أخطاء المصحف المربوطة بموضع (يدخلها المعلم يدوياً بعد الحصة)
create table student_mushaf_mistakes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  teacher_id uuid not null references teachers(id),
  class_id uuid references classes(id) on delete set null,
  surah_number int not null,
  ayah_number int not null,
  word_index int,
  page_number int,
  mistake_type text not null check (
    mistake_type in ('tajweed','memorization','waqf_ibtida','needs_review','excellent')
  ),
  title text not null,
  note text,
  is_resolved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_mushaf_title_len check (char_length(title) <= 200),
  constraint chk_mushaf_note_len  check (note is null or char_length(note) <= 2000)
);
create index idx_mushaf_mistakes_student on student_mushaf_mistakes (student_id, surah_number, ayah_number);
create index idx_mushaf_mistakes_open on student_mushaf_mistakes (student_id) where not is_resolved;

-- ---- إنجازات الطالب (سجلّ زمني — يُمنح كسولاً عند بلوغ الشرط) ----
create table student_achievements (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  achievement_key text not null,
  earned_at timestamptz not null default now(),
  unique(student_id, achievement_key)
);
create index idx_student_achievements on student_achievements (student_id, earned_at desc);
create trigger trg_mushaf_mistakes_updated before update on student_mushaf_mistakes for each row execute function set_updated_at();

-- علامات مرجعية يحفظها الطالب لصفحات المصحف
create table student_mushaf_bookmarks (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  page_number int not null,
  label text,
  created_at timestamptz not null default now(),
  constraint uq_bookmark_student_page unique (student_id, page_number),
  constraint chk_bookmark_label_len check (label is null or char_length(label) <= 120)
);
create index idx_bookmarks_student on student_mushaf_bookmarks (student_id, page_number);
