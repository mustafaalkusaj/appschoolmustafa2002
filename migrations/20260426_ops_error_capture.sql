-- Migration: ops_error_capture
-- Purpose: Error Capture + Fix Prompt Generator system
-- Apply via Supabase SQL Editor or CLI:
--   supabase db push  (if using Supabase CLI with local setup)
--   OR paste into Supabase Dashboard → SQL Editor → Run
--
-- SAFETY: This migration only creates new tables. It does NOT modify
-- existing tables, drop data, or change RLS on existing tables.

BEGIN;

CREATE TABLE IF NOT EXISTS public.ops_errors (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  environment       TEXT        NOT NULL DEFAULT 'production',
  severity          TEXT        NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  status            TEXT        NOT NULL DEFAULT 'open'
                                CHECK (status IN ('open', 'investigating', 'fixed', 'ignored')),
  source            TEXT        NOT NULL
                                CHECK (source IN ('api', 'frontend', 'storage', 'supabase', 'rbac', 'ops')),
  route             TEXT        NULL,
  method            TEXT        NULL,
  page_url          TEXT        NULL,
  action            TEXT        NULL,
  user_role         TEXT        NULL,
  school_id         TEXT        NULL,
  branch_id         TEXT        NULL,
  auth_user_id      TEXT        NULL,
  status_code       INTEGER     NULL,
  error_code        TEXT        NULL,
  error_message     TEXT        NOT NULL,
  safe_stack        TEXT        NULL,
  request_id        TEXT        NULL,
  deployment_id     TEXT        NULL,
  user_agent        TEXT        NULL,
  metadata          JSONB       NOT NULL DEFAULT '{}'::jsonb,
  fix_prompt        TEXT        NULL,
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  occurrence_count  INTEGER     NOT NULL DEFAULT 1
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ops_errors_created_at
  ON public.ops_errors(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ops_errors_severity
  ON public.ops_errors(severity);

CREATE INDEX IF NOT EXISTS idx_ops_errors_status
  ON public.ops_errors(status);

CREATE INDEX IF NOT EXISTS idx_ops_errors_route
  ON public.ops_errors(route);

CREATE INDEX IF NOT EXISTS idx_ops_errors_error_code
  ON public.ops_errors(error_code);

CREATE INDEX IF NOT EXISTS idx_ops_errors_request_id
  ON public.ops_errors(request_id);

CREATE INDEX IF NOT EXISTS idx_ops_errors_last_seen_at
  ON public.ops_errors(last_seen_at DESC);

-- RLS: anon and authenticated cannot read or write.
-- service_role (server-side only) has full access.
-- super_admin reads via protected API routes, never directly from client.
ALTER TABLE public.ops_errors ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'ops_errors'
      AND policyname = 'ops_errors_service_role_all'
  ) THEN
    CREATE POLICY ops_errors_service_role_all
      ON public.ops_errors
      FOR ALL
      TO service_role
      USING (TRUE)
      WITH CHECK (TRUE);
  END IF;
END $$;

COMMIT;

-- HOW TO APPLY
-- ============
-- Option A — Supabase Dashboard:
--   1. Open https://app.supabase.com → your project → SQL Editor
--   2. Paste this entire file and click "Run"
--
-- Option B — psql (if you have the connection string):
--   psql "$DATABASE_URL" -f migrations/20260426_ops_error_capture.sql
--
-- VERIFY:
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name = 'ops_errors';
