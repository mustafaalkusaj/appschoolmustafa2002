-- Tighten upload_sessions RLS: anon policies were using (true) with no filtering.
-- Anon select now restricted to non-expired pending sessions only.
-- Anon update already had status/expiry check — unchanged.
-- Auth select now scoped to school membership.

-- Drop over-permissive policies
drop policy if exists "anon_select_upload_sessions_by_token" on public.upload_sessions;
drop policy if exists "auth_select_upload_sessions" on public.upload_sessions;

-- Anon: only non-expired pending sessions (token validation happens in API/app layer)
create policy "anon_select_upload_sessions_by_token"
  on public.upload_sessions for select
  to anon
  using (status = 'pending' and expires_at > now());

-- Auth: only sessions from the user's own school
create policy "auth_select_upload_sessions"
  on public.upload_sessions for select
  to authenticated
  using (
    school_id in (
      select school_id
      from public.managed_user_profiles
      where auth_user_id = auth.uid()
    )
  );
