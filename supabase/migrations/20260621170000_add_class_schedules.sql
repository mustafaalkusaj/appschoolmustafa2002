create table if not exists public.class_schedules (
  id             uuid        primary key default gen_random_uuid(),
  school_id      uuid        not null references public.schools(id) on delete cascade,
  class_name     text        not null,
  section        text,
  subject_name   text        not null,
  teacher_id     uuid        references public.teachers(id) on delete set null,
  day_of_week    smallint    not null check (day_of_week between 0 and 6), -- 0=Sunday
  start_time     time        not null,
  end_time       time        not null,
  room           text,
  academic_year  text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_class_schedules_school
  on public.class_schedules(school_id);

create index if not exists idx_class_schedules_class
  on public.class_schedules(school_id, class_name);

create index if not exists idx_class_schedules_teacher
  on public.class_schedules(teacher_id);

alter table public.class_schedules enable row level security;

-- School members can read schedules
drop policy if exists school_members_read_schedules on public.class_schedules;
create policy school_members_read_schedules
  on public.class_schedules
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.managed_user_profiles mup
      where mup.auth_user_id = auth.uid()
        and mup.school_id    = class_schedules.school_id
    )
  );

-- Admins can manage schedules
drop policy if exists admin_manage_schedules on public.class_schedules;
create policy admin_manage_schedules
  on public.class_schedules
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.managed_user_profiles mup
      where mup.auth_user_id = auth.uid()
        and mup.school_id    = class_schedules.school_id
        and mup.role         in ('admin', 'super_admin')
    )
  );
