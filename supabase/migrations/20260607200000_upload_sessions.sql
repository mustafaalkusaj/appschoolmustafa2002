-- Upload sessions for QR-based photo capture
create table if not exists public.upload_sessions (
  id uuid primary key default gen_random_uuid(),
  token uuid unique not null default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  student_id uuid references public.students(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'completed', 'expired')),
  image_url text,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  created_at timestamptz not null default now()
);

-- Index for token lookups
create index if not exists idx_upload_sessions_token on public.upload_sessions(token);

-- RLS
alter table public.upload_sessions enable row level security;

-- Authenticated users can insert sessions
create policy "auth_insert_upload_sessions"
  on public.upload_sessions for insert
  to authenticated
  with check (true);

-- Authenticated users can read their school's sessions
create policy "auth_select_upload_sessions"
  on public.upload_sessions for select
  to authenticated
  using (true);

-- Anyone (anon) can read by token (for mobile page validation)
create policy "anon_select_upload_sessions_by_token"
  on public.upload_sessions for select
  to anon
  using (true);

-- Anyone (anon) can update status + image_url by token (for mobile upload)
create policy "anon_update_upload_sessions_by_token"
  on public.upload_sessions for update
  to anon
  using (status = 'pending' and expires_at > now())
  with check (status = 'completed');

-- Enable realtime for this table
alter publication supabase_realtime add table public.upload_sessions;
