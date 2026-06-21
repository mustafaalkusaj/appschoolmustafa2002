-- ============================================================
-- parent_student_links: links a parent auth user to their child
-- students within a school.
--
-- Required by: /api/web/parent/dashboard (queries parent_user_id,
-- student_id, school_id) and the RLS policies already applied in
-- 20260621130000_parent_portal_rls_isolation.sql which reference
-- this table via public.parent_student_links.
--
-- Notes:
--   • parent_user_id → auth.users (Supabase auth, not the managed
--     users/teachers table which only covers managed roles).
--   • student_id → public.students.id (uuid, set in baseline).
--   • school_id → public.schools.id (uuid, set in baseline).
--   • Unique on (parent_user_id, student_id) — a parent cannot be
--     linked to the same student twice.
--   • Admin RLS uses managed_user_profiles.auth_user_id (correct
--     PK column name — NOT user_id).
-- ============================================================

create table if not exists public.parent_student_links (
  id             uuid        primary key default gen_random_uuid(),
  parent_user_id uuid        not null references auth.users(id) on delete cascade,
  student_id     uuid        not null references public.students(id) on delete cascade,
  school_id      uuid        not null references public.schools(id) on delete cascade,
  created_at     timestamptz not null default now(),
  unique (parent_user_id, student_id)
);

-- Indexes for the three FK/filter columns used in every query
create index if not exists idx_parent_student_links_parent  on public.parent_student_links (parent_user_id);
create index if not exists idx_parent_student_links_student on public.parent_student_links (student_id);
create index if not exists idx_parent_student_links_school  on public.parent_student_links (school_id);

-- RLS
alter table public.parent_student_links enable row level security;

-- Parents can only see their own links
drop policy if exists parent_see_own_links on public.parent_student_links;
create policy parent_see_own_links
  on public.parent_student_links
  for select
  to authenticated
  using (parent_user_id = auth.uid());

-- Admins and super_admins can manage links for their school.
-- Uses managed_user_profiles because that is the authoritative table
-- for school staff roles; its PK is auth_user_id (not user_id).
drop policy if exists admin_manage_links on public.parent_student_links;
create policy admin_manage_links
  on public.parent_student_links
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.managed_user_profiles mup
      where mup.auth_user_id = auth.uid()
        and mup.school_id    = parent_student_links.school_id
        and mup.role         in ('admin', 'super_admin')
    )
  );
