-- Grade entries system: grade_schemes, grade_entries, grade_audit_log, student_badges, student_goals
-- Safe to apply on projects that are missing part or all of the earlier grade migrations.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
-- TABLE: grade_schemes
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grade_schemes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  class_level TEXT NOT NULL,
  oral_max NUMERIC NOT NULL DEFAULT 10,
  homework_max NUMERIC NOT NULL DEFAULT 10,
  monthly_max NUMERIC NOT NULL DEFAULT 20,
  midterm_max NUMERIC NOT NULL DEFAULT 20,
  final_max NUMERIC NOT NULL DEFAULT 40,
  total_max NUMERIC NOT NULL DEFAULT 100,
  pass_score NUMERIC NOT NULL DEFAULT 50,
  final_is_ministerial BOOLEAN NOT NULL DEFAULT FALSE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grade_schemes_class_level_check CHECK (class_level IN ('primary', 'intermediate', 'secondary'))
);

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS class_level TEXT;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS oral_max NUMERIC NOT NULL DEFAULT 10;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS homework_max NUMERIC NOT NULL DEFAULT 10;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS monthly_max NUMERIC NOT NULL DEFAULT 20;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS midterm_max NUMERIC NOT NULL DEFAULT 20;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS final_max NUMERIC NOT NULL DEFAULT 40;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS total_max NUMERIC NOT NULL DEFAULT 100;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS pass_score NUMERIC NOT NULL DEFAULT 50;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS final_is_ministerial BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.grade_schemes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_grade_schemes_updated_at ON public.grade_schemes;
CREATE TRIGGER trg_grade_schemes_updated_at
BEFORE UPDATE ON public.grade_schemes
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_grade_schemes_school_id
  ON public.grade_schemes(school_id);

CREATE INDEX IF NOT EXISTS idx_grade_schemes_school_class_level
  ON public.grade_schemes(school_id, class_level);

CREATE INDEX IF NOT EXISTS idx_grade_schemes_school_default
  ON public.grade_schemes(school_id, is_default);

-- ============================================================
-- TABLE: grade_entries
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grade_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE RESTRICT,
  class_id UUID NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID NULL REFERENCES public.sections(id) ON DELETE SET NULL,
  teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
  grade_scheme_id UUID NULL REFERENCES public.grade_schemes(id) ON DELETE SET NULL,
  academic_year TEXT NOT NULL,
  semester SMALLINT NOT NULL DEFAULT 1,
  oral_score NUMERIC NULL,
  homework_score NUMERIC NULL,
  monthly_score NUMERIC NULL,
  midterm_score NUMERIC NULL,
  final_score NUMERIC NULL,
  total_score NUMERIC NULL,
  grade_label TEXT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  locked_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  locked_at TIMESTAMPTZ NULL,
  lock_reason TEXT NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT grade_entries_status_check CHECK (status IN ('draft', 'confirmed', 'locked')),
  CONSTRAINT grade_entries_semester_check CHECK (semester IN (1, 2)),
  UNIQUE(school_id, student_id, subject_id, academic_year, semester)
);

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE RESTRICT;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS grade_scheme_id UUID REFERENCES public.grade_schemes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS academic_year TEXT;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS semester SMALLINT NOT NULL DEFAULT 1;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS oral_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS homework_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS monthly_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS midterm_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS final_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS total_score NUMERIC;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS grade_label TEXT;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS lock_reason TEXT;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.grade_entries
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- Trigger: compute total_score from component scores
CREATE OR REPLACE FUNCTION public.compute_grade_entry_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_score := COALESCE(NEW.oral_score, 0)
    + COALESCE(NEW.homework_score, 0)
    + COALESCE(NEW.monthly_score, 0)
    + COALESCE(NEW.midterm_score, 0)
    + COALESCE(NEW.final_score, 0);
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_grade_entries_compute_total ON public.grade_entries;
CREATE TRIGGER trg_grade_entries_compute_total
BEFORE INSERT OR UPDATE ON public.grade_entries
FOR EACH ROW
EXECUTE FUNCTION public.compute_grade_entry_total();

CREATE INDEX IF NOT EXISTS idx_grade_entries_school_id
  ON public.grade_entries(school_id);

CREATE INDEX IF NOT EXISTS idx_grade_entries_student_id
  ON public.grade_entries(student_id);

CREATE INDEX IF NOT EXISTS idx_grade_entries_subject_id
  ON public.grade_entries(subject_id);

CREATE INDEX IF NOT EXISTS idx_grade_entries_teacher_id
  ON public.grade_entries(teacher_id);

CREATE INDEX IF NOT EXISTS idx_grade_entries_school_year_semester
  ON public.grade_entries(school_id, academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_grade_entries_scope_lookup
  ON public.grade_entries(school_id, class_id, section_id, subject_id, academic_year, semester);

CREATE INDEX IF NOT EXISTS idx_grade_entries_status
  ON public.grade_entries(school_id, status);

-- ============================================================
-- TABLE: grade_audit_log
-- ============================================================

CREATE TABLE IF NOT EXISTS public.grade_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  grade_entry_id UUID NOT NULL REFERENCES public.grade_entries(id) ON DELETE CASCADE,
  changed_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  field_name TEXT NOT NULL,
  old_value TEXT NULL,
  new_value TEXT NULL,
  reason TEXT NULL
);

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS grade_entry_id UUID REFERENCES public.grade_entries(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS field_name TEXT;

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS old_value TEXT;

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS new_value TEXT;

ALTER TABLE IF EXISTS public.grade_audit_log
  ADD COLUMN IF NOT EXISTS reason TEXT;

CREATE INDEX IF NOT EXISTS idx_grade_audit_log_school_id
  ON public.grade_audit_log(school_id);

CREATE INDEX IF NOT EXISTS idx_grade_audit_log_grade_entry_id
  ON public.grade_audit_log(grade_entry_id, changed_at DESC);

CREATE INDEX IF NOT EXISTS idx_grade_audit_log_changed_by
  ON public.grade_audit_log(changed_by, changed_at DESC);

-- ============================================================
-- TABLE: student_badges
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  badge_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_badges_type_check CHECK (badge_type IN ('diamond','gold','silver','bronze','top_student','most_improved','perfect_score','streak','on_time'))
);

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS badge_type TEXT;

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.student_badges
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_student_badges_school_id
  ON public.student_badges(school_id);

CREATE INDEX IF NOT EXISTS idx_student_badges_student_id
  ON public.student_badges(student_id, earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_student_badges_school_badge_type
  ON public.student_badges(school_id, badge_type);

CREATE INDEX IF NOT EXISTS idx_student_badges_subject_id
  ON public.student_badges(subject_id);

-- ============================================================
-- TABLE: student_goals
-- ============================================================

CREATE TABLE IF NOT EXISTS public.student_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  target_score NUMERIC NOT NULL,
  deadline DATE NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT student_goals_status_check CHECK (status IN ('active', 'achieved', 'missed'))
);

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS target_score NUMERIC;

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS deadline DATE;

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.student_goals
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_student_goals_updated_at ON public.student_goals;
CREATE TRIGGER trg_student_goals_updated_at
BEFORE UPDATE ON public.student_goals
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_student_goals_school_id
  ON public.student_goals(school_id);

CREATE INDEX IF NOT EXISTS idx_student_goals_student_id
  ON public.student_goals(student_id);

CREATE INDEX IF NOT EXISTS idx_student_goals_school_status
  ON public.student_goals(school_id, status);

CREATE INDEX IF NOT EXISTS idx_student_goals_subject_id
  ON public.student_goals(subject_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

DO $$
DECLARE
  has_app_role_fn BOOLEAN := to_regprocedure('public.current_app_role()') IS NOT NULL;
  has_school_scope_fn BOOLEAN := to_regprocedure('public.current_school_id()') IS NOT NULL;
BEGIN
  IF has_app_role_fn AND has_school_scope_fn THEN
    EXECUTE 'ALTER TABLE public.grade_schemes ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.grade_entries ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.grade_audit_log ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.student_badges ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY';

    -- grade_schemes
    EXECUTE 'DROP POLICY IF EXISTS grade_schemes_admin_manage_policy ON public.grade_schemes';
    EXECUTE $policy$
      CREATE POLICY grade_schemes_admin_manage_policy
      ON public.grade_schemes
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;

    -- grade_entries: admin manage policy
    EXECUTE 'DROP POLICY IF EXISTS grade_entries_admin_manage_policy ON public.grade_entries';
    EXECUTE $policy$
      CREATE POLICY grade_entries_admin_manage_policy
      ON public.grade_entries
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;

    -- grade_audit_log
    EXECUTE 'DROP POLICY IF EXISTS grade_audit_log_admin_manage_policy ON public.grade_audit_log';
    EXECUTE $policy$
      CREATE POLICY grade_audit_log_admin_manage_policy
      ON public.grade_audit_log
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;

    -- student_badges
    EXECUTE 'DROP POLICY IF EXISTS student_badges_admin_manage_policy ON public.student_badges';
    EXECUTE $policy$
      CREATE POLICY student_badges_admin_manage_policy
      ON public.student_badges
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;

    -- student_goals
    EXECUTE 'DROP POLICY IF EXISTS student_goals_admin_manage_policy ON public.student_goals';
    EXECUTE $policy$
      CREATE POLICY student_goals_admin_manage_policy
      ON public.student_goals
      FOR ALL
      TO authenticated
      USING (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
      WITH CHECK (
        public.current_app_role() = 'super_admin'
        OR (
          public.current_app_role() = 'admin'
          AND school_id = public.current_school_id()
        )
      )
    $policy$;
  END IF;
END
$$;

COMMIT;
