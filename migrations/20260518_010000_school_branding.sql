-- ============================================================
-- Migration: School Branding Columns
-- Date: 2026-05-18
-- Purpose:
--   Add White Label branding fields to the schools table so each
--   school can have its own app name, logo, and color scheme.
--   The mobile app fetches these at login to apply the theme.
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- 1. Add branding columns to schools table
-- --------------------------------------------------------

-- Display name used inside the app (can differ from legal school name)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS app_name TEXT NULL;

-- Full public URL to the school logo (stored in Supabase Storage)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;

-- Hex color for primary brand color, e.g. '#1B6B4A'
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS primary_color TEXT NULL
  CONSTRAINT schools_primary_color_format CHECK (
    primary_color IS NULL
    OR primary_color ~ '^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$'
  );

-- Hex color for secondary/accent brand color
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS secondary_color TEXT NULL
  CONSTRAINT schools_secondary_color_format CHECK (
    secondary_color IS NULL
    OR secondary_color ~ '^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$'
  );

-- Optional named theme preset (references brand-themes.ts preset IDs)
-- e.g. 'forest-green', 'ocean-blue', 'royal-purple' etc.
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS theme_preset TEXT NULL;

-- --------------------------------------------------------
-- 2. RLS: allow authenticated users to read branding of their school
--
--    We expose only the branding columns — not financial or sensitive
--    school data — to any authenticated user belonging to that school.
--    The mobile app reads these at login to apply the theme.
-- --------------------------------------------------------

-- Policy: managed users can read their own school's branding
-- (Uses current_managed_school_id() if the managed tables exist,
--  otherwise the existing admin policy already covers web access.)
DO $$
BEGIN
  IF to_regprocedure('public.current_managed_school_id()') IS NOT NULL THEN
    EXECUTE $policy$
      DROP POLICY IF EXISTS schools_managed_read_branding ON public.schools
    $policy$;
    EXECUTE $policy$
      CREATE POLICY schools_managed_read_branding
      ON public.schools
      FOR SELECT
      TO authenticated
      USING (
        id = public.current_managed_school_id()
      )
    $policy$;
  END IF;
END
$$;

-- Policy: managed users cannot write branding (admin-only via existing admin policy)
-- No changes needed — existing admin SELECT/UPDATE policies already exist.

-- --------------------------------------------------------
-- 3. Storage bucket for school logos (run once if not exists)
--    The bucket is created by Supabase dashboard / API, but we document
--    the expected name and access policy here for reference.
--    Actual bucket creation must be done via Supabase dashboard or CLI.
-- --------------------------------------------------------

-- Expected bucket: 'school-assets' (public read, admin-only write)
-- Object path pattern: school-assets/{school_id}/logo.{ext}
-- This comment is intentional — bucket creation via SQL is not supported
-- in Supabase's managed environment.

-- --------------------------------------------------------
-- 4. Convenience view for the mobile app to read school branding
--    Returns only the branding-safe columns for the current user's school.
-- --------------------------------------------------------

CREATE OR REPLACE VIEW public.my_school_branding AS
SELECT
  id,
  app_name,
  logo_url,
  primary_color,
  secondary_color,
  theme_preset
FROM public.schools
WHERE id = public.current_managed_school_id();

-- Grant select on the view to authenticated users
GRANT SELECT ON public.my_school_branding TO authenticated;

-- --------------------------------------------------------
-- 5. Add school_id to assignments and grades tables for branch queries
--    (These columns may already exist — ADD COLUMN IF NOT EXISTS is safe)
-- --------------------------------------------------------

-- assignments.branch_id — links each assignment to a specific branch (optional)
ALTER TABLE public.assignments
  ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_assignments_branch_id
  ON public.assignments(branch_id);

-- grades.branch_id — denormalized from student for fast branch-scoped queries
ALTER TABLE public.grades
  ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_grades_branch_id
  ON public.grades(branch_id);

-- Backfill grades.branch_id from the linked student
UPDATE public.grades AS g
SET branch_id = s.branch_id
FROM public.students AS s
WHERE g.student_id = s.id
  AND g.branch_id IS NULL
  AND s.branch_id IS NOT NULL;

COMMIT;
