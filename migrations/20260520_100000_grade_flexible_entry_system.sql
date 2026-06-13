-- ============================================================
-- Migration: Flexible Grade Entry System
-- ============================================================
-- Transforms the grading system from fixed 5-column scores
-- (oral, homework, monthly, midterm, final) to a flexible
-- individual-entry model where each entry has:
--   - a grade_type (quiz, homework, exam, etc.)
--   - score / max_score (e.g. 8 out of 10)
--   - percentage (computed)
--   - optional notification flag
--
-- Changes:
--   1. CREATE grade_types table (flexible type definitions per school)
--   2. ALTER grade_entries: add new columns, drop old trigger
--   3. DROP old unique constraint (multiple entries per student now allowed)
--   4. Seed default grade types for existing schools
--   5. Update indexes for new query patterns
--   6. RLS policies for grade_types
-- ============================================================

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Ensure the updated_at trigger function exists
DO $$
BEGIN
  IF to_regprocedure('public.set_dashboard_managed_updated_at()') IS NULL THEN
    EXECUTE $sql$
      CREATE FUNCTION public.set_dashboard_managed_updated_at()
      RETURNS TRIGGER AS $fn$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $fn$ LANGUAGE plpgsql
    $sql$;
  END IF;
END
$$;

-- ============================================================
-- 1. TABLE: grade_types (flexible grade type definitions)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grade_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other',
  default_max_score NUMERIC NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grade_types_category_check CHECK (
    category IN ('quiz', 'homework', 'monthly', 'midterm', 'final', 'oral', 'project', 'participation', 'other')
  ),
  CONSTRAINT grade_types_max_score_positive CHECK (default_max_score > 0)
);

-- Idempotent column adds (safe if table already existed with fewer columns)
ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS name_ar TEXT;

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS name_en TEXT NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'other';

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS default_max_score NUMERIC NOT NULL DEFAULT 10;

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0;

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.grade_types
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_grade_types_updated_at ON public.grade_types;
CREATE TRIGGER trg_grade_types_updated_at
BEFORE UPDATE ON public.grade_types
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_grade_types_school_id
  ON public.grade_types(school_id);

CREATE INDEX IF NOT EXISTS idx_grade_types_school_active
  ON public.grade_types(school_id, is_active);

CREATE INDEX IF NOT EXISTS idx_grade_types_school_category
  ON public.grade_types(school_id, category);

CREATE UNIQUE INDEX IF NOT EXISTS idx_grade_types_school_name_unique
  ON public.grade_types(school_id, name);

-- ============================================================
-- 2. ALTER grade_entries: add new flexible columns
-- ============================================================

-- New columns for flexible entry system
ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS grade_type_id UUID REFERENCES public.grade_types(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS grade_type_name TEXT;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS max_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS percentage NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS notification_sent BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS notification_sent_at TIMESTAMPTZ;

-- note column was already added by a previous migration (20260519_000001)
-- but ensure it exists
ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS note TEXT;

-- ============================================================
-- 3. DROP old unique constraint
-- ============================================================
-- The old system enforced one entry per student/subject/year/semester.
-- The new system allows multiple entries (e.g., quiz 1, quiz 2, homework 3).

DO $$
BEGIN
  -- Drop the unique constraint if it exists (name from the CREATE TABLE)
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grade_entries_school_id_student_id_subject_id_academic_year_key'
      AND conrelid = 'public.grade_entries'::regclass
  ) THEN
    ALTER TABLE public.grade_entries
      DROP CONSTRAINT grade_entries_school_id_student_id_subject_id_academic_year_key;
  END IF;

  -- Also try the shorter auto-generated name variant
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'grade_entries_school_id_student_id_subject_id_academic_yea_key'
      AND conrelid = 'public.grade_entries'::regclass
  ) THEN
    ALTER TABLE public.grade_entries
      DROP CONSTRAINT grade_entries_school_id_student_id_subject_id_academic_yea_key;
  END IF;
END
$$;

-- ============================================================
-- 4. Replace old trigger with new percentage trigger
-- ============================================================

-- Drop the old total_score compute trigger
DROP TRIGGER IF EXISTS trg_grade_entries_compute_total ON public.grade_entries;

-- New trigger: compute percentage from score/max_score
CREATE OR REPLACE FUNCTION public.compute_grade_entry_percentage()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.max_score IS NOT NULL AND NEW.max_score > 0 AND NEW.score IS NOT NULL THEN
    NEW.percentage := ROUND((NEW.score / NEW.max_score) * 100, 2);
  ELSE
    NEW.percentage := NULL;
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grade_entries_compute_percentage ON public.grade_entries;
CREATE TRIGGER trg_grade_entries_compute_percentage
BEFORE INSERT OR UPDATE ON public.grade_entries
FOR EACH ROW
EXECUTE FUNCTION public.compute_grade_entry_percentage();

-- ============================================================
-- 5. New indexes for flexible entry queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_grade_entries_grade_type_id
  ON public.grade_entries(grade_type_id);

CREATE INDEX IF NOT EXISTS idx_grade_entries_student_subject_year
  ON public.grade_entries(student_id, subject_id, academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_grade_entries_notification
  ON public.grade_entries(school_id, notification_sent)
  WHERE notification_sent = FALSE;

-- ============================================================
-- 6. Seed default grade types for every existing school
-- ============================================================
-- This gives schools a starting set of grade types matching the old system.

INSERT INTO public.grade_types (school_id, name, name_ar, name_en, category, default_max_score, is_active, sort_order)
SELECT
  s.id,
  t.name,
  t.name_ar,
  t.name_en,
  t.category,
  t.default_max_score,
  TRUE,
  t.sort_order
FROM public.schools s
CROSS JOIN (
  VALUES
    ('شفهي',        'شفهي',        'Oral',          'oral',          10, 1),
    ('واجبات',      'واجبات',      'Homework',      'homework',      10, 2),
    ('شهري',        'شهري',        'Monthly Exam',  'monthly',       20, 3),
    ('نصف السنة',   'نصف السنة',   'Midterm',       'midterm',       20, 4),
    ('نهائي',       'نهائي',       'Final Exam',    'final',         40, 5),
    ('اختبار قصير', 'اختبار قصير', 'Quiz',          'quiz',          10, 6),
    ('مشروع',       'مشروع',       'Project',       'project',       20, 7),
    ('مشاركة',      'مشاركة',      'Participation', 'participation', 10, 8)
) AS t(name, name_ar, name_en, category, default_max_score, sort_order)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 7. Migrate old fixed-column data to new flexible entries
-- ============================================================
-- For each existing grade_entries row that has old fixed scores,
-- create individual entries in the new format.
-- We only migrate rows that have at least one non-null old score
-- AND don't already have a new-style score set.

DO $$
DECLARE
  r RECORD;
  gt_oral UUID;
  gt_homework UUID;
  gt_monthly UUID;
  gt_midterm UUID;
  gt_final UUID;
  v_school UUID;
BEGIN
  -- Process each school that has old-style grade entries
  FOR v_school IN
    SELECT DISTINCT school_id FROM public.grade_entries
    WHERE score IS NULL
      AND (oral_score IS NOT NULL OR homework_score IS NOT NULL
        OR monthly_score IS NOT NULL OR midterm_score IS NOT NULL
        OR final_score IS NOT NULL)
  LOOP
    -- Look up the grade type IDs for this school
    SELECT id INTO gt_oral FROM public.grade_types
      WHERE school_id = v_school AND category = 'oral' LIMIT 1;
    SELECT id INTO gt_homework FROM public.grade_types
      WHERE school_id = v_school AND category = 'homework' LIMIT 1;
    SELECT id INTO gt_monthly FROM public.grade_types
      WHERE school_id = v_school AND category = 'monthly' LIMIT 1;
    SELECT id INTO gt_midterm FROM public.grade_types
      WHERE school_id = v_school AND category = 'midterm' LIMIT 1;
    SELECT id INTO gt_final FROM public.grade_types
      WHERE school_id = v_school AND category = 'final' LIMIT 1;

    -- For each old entry, insert individual new-style rows
    FOR r IN
      SELECT * FROM public.grade_entries
      WHERE school_id = v_school
        AND score IS NULL
        AND (oral_score IS NOT NULL OR homework_score IS NOT NULL
          OR monthly_score IS NOT NULL OR midterm_score IS NOT NULL
          OR final_score IS NOT NULL)
    LOOP
      -- Oral
      IF r.oral_score IS NOT NULL AND gt_oral IS NOT NULL THEN
        INSERT INTO public.grade_entries (
          school_id, student_id, subject_id, class_id, section_id, teacher_id,
          grade_type_id, grade_type_name, academic_year, semester,
          score, max_score, status, note, created_by, updated_by
        ) VALUES (
          r.school_id, r.student_id, r.subject_id, r.class_id, r.section_id, r.teacher_id,
          gt_oral, 'شفهي', r.academic_year, r.semester,
          r.oral_score, 10, r.status, NULL, r.created_by, r.updated_by
        );
      END IF;

      -- Homework
      IF r.homework_score IS NOT NULL AND gt_homework IS NOT NULL THEN
        INSERT INTO public.grade_entries (
          school_id, student_id, subject_id, class_id, section_id, teacher_id,
          grade_type_id, grade_type_name, academic_year, semester,
          score, max_score, status, note, created_by, updated_by
        ) VALUES (
          r.school_id, r.student_id, r.subject_id, r.class_id, r.section_id, r.teacher_id,
          gt_homework, 'واجبات', r.academic_year, r.semester,
          r.homework_score, 10, r.status, NULL, r.created_by, r.updated_by
        );
      END IF;

      -- Monthly
      IF r.monthly_score IS NOT NULL AND gt_monthly IS NOT NULL THEN
        INSERT INTO public.grade_entries (
          school_id, student_id, subject_id, class_id, section_id, teacher_id,
          grade_type_id, grade_type_name, academic_year, semester,
          score, max_score, status, note, created_by, updated_by
        ) VALUES (
          r.school_id, r.student_id, r.subject_id, r.class_id, r.section_id, r.teacher_id,
          gt_monthly, 'شهري', r.academic_year, r.semester,
          r.monthly_score, 20, r.status, NULL, r.created_by, r.updated_by
        );
      END IF;

      -- Midterm
      IF r.midterm_score IS NOT NULL AND gt_midterm IS NOT NULL THEN
        INSERT INTO public.grade_entries (
          school_id, student_id, subject_id, class_id, section_id, teacher_id,
          grade_type_id, grade_type_name, academic_year, semester,
          score, max_score, status, note, created_by, updated_by
        ) VALUES (
          r.school_id, r.student_id, r.subject_id, r.class_id, r.section_id, r.teacher_id,
          gt_midterm, 'نصف السنة', r.academic_year, r.semester,
          r.midterm_score, 20, r.status, NULL, r.created_by, r.updated_by
        );
      END IF;

      -- Final
      IF r.final_score IS NOT NULL AND gt_final IS NOT NULL THEN
        INSERT INTO public.grade_entries (
          school_id, student_id, subject_id, class_id, section_id, teacher_id,
          grade_type_id, grade_type_name, academic_year, semester,
          score, max_score, status, note, created_by, updated_by
        ) VALUES (
          r.school_id, r.student_id, r.subject_id, r.class_id, r.section_id, r.teacher_id,
          gt_final, 'نهائي', r.academic_year, r.semester,
          r.final_score, 40, r.status, NULL, r.created_by, r.updated_by
        );
      END IF;

      -- Mark the old row as migrated by setting its score to total_score
      -- so it won't be processed again
      UPDATE public.grade_entries
        SET score = COALESCE(r.total_score, 0),
            max_score = 100,
            grade_type_name = '_migrated_combined'
        WHERE id = r.id;
    END LOOP;
  END LOOP;
END
$$;

-- ============================================================
-- 8. RLS Policies for grade_types
-- ============================================================

DO $$
DECLARE
  has_app_role_fn BOOLEAN := to_regprocedure('public.current_app_role()') IS NOT NULL;
  has_school_scope_fn BOOLEAN := to_regprocedure('public.current_school_id()') IS NOT NULL;
BEGIN
  IF has_app_role_fn AND has_school_scope_fn THEN
    EXECUTE 'ALTER TABLE public.grade_types ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS grade_types_admin_manage_policy ON public.grade_types';
    EXECUTE $policy$
      CREATE POLICY grade_types_admin_manage_policy
      ON public.grade_types
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() IN ('admin', 'employee')
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() IN ('admin', 'employee')
          AND school_id = public.current_school_id()
        )
      )
    $policy$;

    -- Update grade_entries policy to also allow employees (teachers)
    EXECUTE 'DROP POLICY IF EXISTS grade_entries_employee_policy ON public.grade_entries';
    EXECUTE $policy$
      CREATE POLICY grade_entries_employee_policy
      ON public.grade_entries
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() IN ('super_admin', 'admin', 'employee')
        AND (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() IN ('super_admin', 'admin', 'employee')
        AND (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
      )
    $policy$;
  END IF;
END
$$;

COMMIT;
