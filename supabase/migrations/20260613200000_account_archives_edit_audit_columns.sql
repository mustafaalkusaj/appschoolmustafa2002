-- Audit trail for edits to yearly account archive snapshots.
-- PATCH /api/web/payments/archive now stamps who edited the archive and when.
ALTER TABLE public.account_archives
  ADD COLUMN IF NOT EXISTS updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_by uuid;

COMMENT ON COLUMN public.account_archives.updated_at IS 'Set when the archive snapshot is edited via PATCH /api/web/payments/archive.';
COMMENT ON COLUMN public.account_archives.updated_by IS 'Auth user id of the actor who last edited the archive snapshot.';
