begin;

create extension if not exists pgcrypto;

create or replace function set_admin_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists admin_roles (
  id text primary key,
  key text not null unique,
  name text not null,
  description text not null default '',
  permissions text[] not null default '{}',
  is_system boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists admin_schools (
  id text primary key,
  name text not null,
  code text not null unique,
  status text not null check (status in ('active', 'suspended')),
  student_count integer not null default 0,
  monthly_revenue numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists admin_school_subscriptions (
  id text primary key,
  school_id text not null references admin_schools(id) on delete cascade,
  plan text not null check (plan in ('monthly', 'yearly')),
  started_at timestamptz not null,
  expires_at timestamptz not null,
  amount numeric(12,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists admin_users (
  id text primary key,
  name text not null,
  email text not null,
  role_key text not null references admin_roles(key),
  permissions text[] not null default '{}',
  school_id text references admin_schools(id),
  status text not null check (status in ('active', 'blocked')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists admin_notifications (
  id text primary key,
  type text not null check (type in ('subscription', 'user', 'system')),
  code text not null,
  data jsonb,
  school_id text references admin_schools(id),
  read boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz,
  deleted_by text
);

create table if not exists admin_audit_logs (
  id text primary key,
  actor_id text not null,
  actor_name text not null,
  action text not null,
  entity text not null,
  entity_id text not null,
  metadata jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  deleted_at timestamptz
);

create table if not exists admin_system_settings (
  id text primary key,
  system_name text not null,
  logo_url text not null,
  timezone text not null,
  currency text not null,
  allow_self_registration boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index if not exists admin_users_email_active_idx
  on admin_users (lower(email))
  where deleted_at is null;

create unique index if not exists admin_schools_code_active_idx
  on admin_schools (upper(code))
  where deleted_at is null;

create index if not exists admin_users_role_key_idx on admin_users (role_key);
create index if not exists admin_users_school_id_idx on admin_users (school_id);
create index if not exists admin_notifications_school_id_idx on admin_notifications (school_id);
create index if not exists admin_subscriptions_school_id_idx on admin_school_subscriptions (school_id);

drop trigger if exists admin_roles_set_updated_at on admin_roles;
create trigger admin_roles_set_updated_at
before update on admin_roles
for each row execute function set_admin_updated_at();

drop trigger if exists admin_schools_set_updated_at on admin_schools;
create trigger admin_schools_set_updated_at
before update on admin_schools
for each row execute function set_admin_updated_at();

drop trigger if exists admin_school_subscriptions_set_updated_at on admin_school_subscriptions;
create trigger admin_school_subscriptions_set_updated_at
before update on admin_school_subscriptions
for each row execute function set_admin_updated_at();

drop trigger if exists admin_users_set_updated_at on admin_users;
create trigger admin_users_set_updated_at
before update on admin_users
for each row execute function set_admin_updated_at();

drop trigger if exists admin_notifications_set_updated_at on admin_notifications;
create trigger admin_notifications_set_updated_at
before update on admin_notifications
for each row execute function set_admin_updated_at();

drop trigger if exists admin_system_settings_set_updated_at on admin_system_settings;
create trigger admin_system_settings_set_updated_at
before update on admin_system_settings
for each row execute function set_admin_updated_at();

insert into admin_roles (id, key, name, description, permissions, is_system, created_at, updated_at)
values
  ('role-super-admin', 'super_admin', 'Super Admin', 'Global control over schools, subscriptions, audit, and platform settings.', array['full_access','view_students','add_students','edit_students','delete_students','view_payments','add_payments','delete_payments','view_salaries','manage_salaries','manage_schools','manage_subscriptions'], true, timezone('utc', now()) - interval '260 days', timezone('utc', now()) - interval '10 days'),
  ('role-admin', 'admin', 'School Admin', 'Owns daily school operations, staff access, and finance approvals.', array['view_students','add_students','edit_students','delete_students','view_payments','add_payments','delete_payments','view_salaries','manage_salaries'], true, timezone('utc', now()) - interval '260 days', timezone('utc', now()) - interval '10 days'),
  ('role-employee', 'employee', 'Employee', 'Handles day-to-day student and payment operations.', array['view_students','add_students','edit_students','view_payments','add_payments'], true, timezone('utc', now()) - interval '260 days', timezone('utc', now()) - interval '10 days'),
  ('role-teacher', 'teacher', 'Teacher', 'Read-first access for classroom and payroll visibility.', array['view_students','view_payments','view_salaries'], true, timezone('utc', now()) - interval '260 days', timezone('utc', now()) - interval '10 days'),
  ('role-registrar', 'registrar', 'Registrar', 'Custom role for admission and records teams with no billing access.', array['view_students','add_students','edit_students'], false, timezone('utc', now()) - interval '40 days', timezone('utc', now()) - interval '8 days')
on conflict (id) do update
set
  key = excluded.key,
  name = excluded.name,
  description = excluded.description,
  permissions = excluded.permissions,
  is_system = excluded.is_system,
  deleted_at = null,
  deleted_by = null;

insert into admin_schools (id, name, code, status, student_count, monthly_revenue, created_at, updated_at)
values
  ('school-1', 'أكاديمية الشروق', 'SUN-01', 'active', 812, 18000, timezone('utc', now()) - interval '180 days', timezone('utc', now()) - interval '5 days'),
  ('school-2', 'مدارس النور الدولية', 'NOR-04', 'active', 560, 12400, timezone('utc', now()) - interval '130 days', timezone('utc', now()) - interval '5 days'),
  ('school-3', 'مدرسة قادة المستقبل', 'FTR-11', 'suspended', 410, 9100, timezone('utc', now()) - interval '95 days', timezone('utc', now()) - interval '5 days'),
  ('school-4', 'كلية المسار المشرق', 'BRG-22', 'active', 936, 22100, timezone('utc', now()) - interval '60 days', timezone('utc', now()) - interval '5 days'),
  ('school-5', 'مدرسة الحكمة الأهلية', 'WIS-18', 'active', 670, 15400, timezone('utc', now()) - interval '30 days', timezone('utc', now()) - interval '5 days')
on conflict (id) do update
set
  name = excluded.name,
  code = excluded.code,
  status = excluded.status,
  student_count = excluded.student_count,
  monthly_revenue = excluded.monthly_revenue,
  deleted_at = null,
  deleted_by = null;

insert into admin_school_subscriptions (id, school_id, plan, started_at, expires_at, amount, created_at, updated_at)
values
  ('sub-1', 'school-1', 'yearly', timezone('utc', now()) - interval '150 days', timezone('utc', now()) + interval '20 days', 12000, timezone('utc', now()) - interval '150 days', timezone('utc', now()) - interval '5 days'),
  ('sub-2', 'school-2', 'monthly', timezone('utc', now()) - interval '20 days', timezone('utc', now()) + interval '5 days', 900, timezone('utc', now()) - interval '20 days', timezone('utc', now()) - interval '5 days'),
  ('sub-3', 'school-3', 'monthly', timezone('utc', now()) - interval '40 days', timezone('utc', now()) - interval '2 days', 850, timezone('utc', now()) - interval '40 days', timezone('utc', now()) - interval '5 days'),
  ('sub-4', 'school-4', 'yearly', timezone('utc', now()) - interval '30 days', timezone('utc', now()) + interval '300 days', 14000, timezone('utc', now()) - interval '30 days', timezone('utc', now()) - interval '5 days'),
  ('sub-5', 'school-5', 'monthly', timezone('utc', now()) - interval '9 days', timezone('utc', now()) + interval '25 days', 1100, timezone('utc', now()) - interval '9 days', timezone('utc', now()) - interval '5 days')
on conflict (id) do update
set
  school_id = excluded.school_id,
  plan = excluded.plan,
  started_at = excluded.started_at,
  expires_at = excluded.expires_at,
  amount = excluded.amount,
  deleted_at = null,
  deleted_by = null;

insert into admin_users (id, name, email, role_key, permissions, school_id, status, created_at, updated_at)
values
  ('user-1', 'مصطفى', 'superadmin@saas.local', 'super_admin', array['full_access','view_students','add_students','edit_students','delete_students','view_payments','add_payments','delete_payments','view_salaries','manage_salaries','manage_schools','manage_subscriptions'], null, 'active', timezone('utc', now()) - interval '220 days', timezone('utc', now()) - interval '5 days'),
  ('user-2', 'نورة', 'admin@sunrise.local', 'admin', array['view_students','add_students','edit_students','delete_students','view_payments','add_payments','delete_payments','view_salaries','manage_salaries'], 'school-1', 'active', timezone('utc', now()) - interval '120 days', timezone('utc', now()) - interval '5 days'),
  ('user-3', 'أحمد', 'employee@sunrise.local', 'employee', array['view_students','add_students','edit_students','view_payments','add_payments'], 'school-1', 'active', timezone('utc', now()) - interval '90 days', timezone('utc', now()) - interval '5 days'),
  ('user-4', 'سارة', 'teacher@sunrise.local', 'teacher', array['view_students','view_payments','view_salaries'], 'school-1', 'active', timezone('utc', now()) - interval '70 days', timezone('utc', now()) - interval '5 days'),
  ('user-5', 'هدى', 'admin@future.local', 'admin', array['view_students','add_students','edit_students','delete_students','view_payments','add_payments','delete_payments','view_salaries','manage_salaries','manage_schools','manage_subscriptions'], 'school-3', 'active', timezone('utc', now()) - interval '65 days', timezone('utc', now()) - interval '5 days'),
  ('user-6', 'موظف محظور', 'blocked@school.local', 'employee', array['view_students','add_students','edit_students','view_payments','add_payments'], 'school-2', 'blocked', timezone('utc', now()) - interval '20 days', timezone('utc', now()) - interval '5 days')
on conflict (id) do update
set
  name = excluded.name,
  email = excluded.email,
  role_key = excluded.role_key,
  permissions = excluded.permissions,
  school_id = excluded.school_id,
  status = excluded.status,
  deleted_at = null,
  deleted_by = null;

insert into admin_notifications (id, type, code, data, school_id, read, created_at, updated_at)
values
  ('notification-expired-school-3', 'subscription', 'subscription_expired', jsonb_build_object('schoolName', 'مدرسة قادة المستقبل'), 'school-3', false, timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day'),
  ('notification-expiring-school-2', 'subscription', 'subscription_ending_soon', jsonb_build_object('schoolName', 'مدارس النور الدولية', 'days', 5), 'school-2', false, timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day'),
  ('notification-user-created', 'user', 'user_onboarded', jsonb_build_object('role', 'employee', 'schoolName', 'أكاديمية الشروق'), 'school-1', false, timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day'),
  ('notification-system-error', 'system', 'system_warning', null, null, false, timezone('utc', now()) - interval '1 day', timezone('utc', now()) - interval '1 day')
on conflict (id) do update
set
  type = excluded.type,
  code = excluded.code,
  data = excluded.data,
  school_id = excluded.school_id,
  read = excluded.read,
  deleted_at = null,
  deleted_by = null;

insert into admin_audit_logs (id, actor_id, actor_name, action, entity, entity_id, created_at)
values
  ('audit-1', 'user-1', 'مصطفى', 'created_school', 'school', 'school-5', timezone('utc', now()) - interval '14 days'),
  ('audit-2', 'user-2', 'نورة', 'deleted_student', 'student', 'std-991', timezone('utc', now()) - interval '6 days'),
  ('audit-3', 'user-3', 'أحمد', 'recorded_payment', 'payment', 'pay-551', timezone('utc', now()) - interval '3 days'),
  ('audit-4', 'user-1', 'مصطفى', 'changed_system_settings', 'system', 'settings-default', timezone('utc', now()) - interval '1 day')
on conflict (id) do nothing;

insert into admin_system_settings (id, system_name, logo_url, timezone, currency, allow_self_registration, created_at, updated_at)
values (
  'settings-default',
  'منصة المدارس الذكية',
  'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=120&q=80',
  'Asia/Baghdad',
  'USD',
  false,
  timezone('utc', now()) - interval '30 days',
  timezone('utc', now()) - interval '1 day'
)
on conflict (id) do update
set
  system_name = excluded.system_name,
  logo_url = excluded.logo_url,
  timezone = excluded.timezone,
  currency = excluded.currency,
  allow_self_registration = excluded.allow_self_registration;

commit;
