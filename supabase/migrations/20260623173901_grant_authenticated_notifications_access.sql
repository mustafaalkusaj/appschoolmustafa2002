-- The dashboard reads a user's legacy notifications directly through the
-- Supabase Data API. Object grants are required in addition to the existing
-- notifications_owner_all RLS policy; without them PostgREST rejects the
-- request before row-level security can authorize the owner row.
GRANT SELECT, INSERT, UPDATE ON TABLE public.notifications TO authenticated;
