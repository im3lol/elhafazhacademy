-- إعدادات التطبيق (key-value) — لتخزين توكنات/إعدادات التكاملات
create table if not exists app_settings (
  key        text primary key,
  value      jsonb,
  updated_at timestamptz not null default now()
);
