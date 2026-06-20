-- ============================================================
-- Drop plaintext temporary-password storage (security hardening)
-- ============================================================
-- Application code no longer writes cleartext temporary passwords into
-- managed_user_credentials. The generated temporary password is returned
-- once in the create/reset HTTP response (in memory) and never persisted.
-- This migration scrubs any historical cleartext and drops the column.
--
-- Affected:
--   public.managed_user_credentials.temporary_password_plain
--
-- Deliberately NOT included (separate follow-up — still has live writers
-- and UI readers, dropping now would break the app):
--   public.teachers.app_password_plain
--     Written by: app/api/web/teachers/route.ts, .../bulk-accounts/route.ts,
--                 .../[teacherId]/app-account/route.ts
--     Read by:    app/[locale]/teachers/* (QR/print cards)
--     These paths must migrate to managed_user_credentials first.
--
-- Also out of scope for SQL: cleartext lingering in Supabase auth
--   app_metadata.managed_credentials.temporary_password_plain
-- (auth schema — clear via an admin script using auth.admin.updateUserById).
-- ============================================================

UPDATE public.managed_user_credentials
  SET temporary_password_plain = NULL
  WHERE temporary_password_plain IS NOT NULL;

ALTER TABLE public.managed_user_credentials
  DROP COLUMN IF EXISTS temporary_password_plain;
