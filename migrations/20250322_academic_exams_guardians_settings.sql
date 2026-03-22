-- Run in Supabase SQL Editor after database_setup.sql and admin_infrastructure.sql.
-- Academic years/terms tenant access, exams, grades, guardians, school settings.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Allow school admins to update their own school row (name, contact, etc.)
DROP POLICY IF EXISTS schools_tenant_update_policy ON public.schools;
CREATE POLICY schools_tenant_update_policy
ON public.schools
FOR UPDATE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR id = public.current_school_id()
)
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR id = public.current_school_id()
);

-- ---------------------------------------------------------------------------
-- academic_years: archive + tenant RLS (super_admin OR own school)
-- ---------------------------------------------------------------------------
ALTER TABLE public.academic_years
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ NULL;

DROP POLICY IF EXISTS academic_years_super_admin_all ON public.academic_years;

DROP POLICY IF EXISTS academic_years_tenant_select ON public.academic_years;
CREATE POLICY academic_years_tenant_select
ON public.academic_years
FOR SELECT
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS academic_years_tenant_insert ON public.academic_years;
CREATE POLICY academic_years_tenant_insert
ON public.academic_years
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS academic_years_tenant_update ON public.academic_years;
CREATE POLICY academic_years_tenant_update
ON public.academic_years
FOR UPDATE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
)
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS academic_years_tenant_delete ON public.academic_years;
CREATE POLICY academic_years_tenant_delete
ON public.academic_years
FOR DELETE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_academic_years_one_current_per_school
ON public.academic_years (school_id)
WHERE is_current = TRUE;

-- ---------------------------------------------------------------------------
-- academic_terms
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (academic_year_id, name)
);

CREATE INDEX IF NOT EXISTS idx_academic_terms_school_id ON public.academic_terms(school_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_year_id ON public.academic_terms(academic_year_id);

ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS academic_terms_tenant_select ON public.academic_terms;
CREATE POLICY academic_terms_tenant_select
ON public.academic_terms
FOR SELECT
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS academic_terms_tenant_insert ON public.academic_terms;
CREATE POLICY academic_terms_tenant_insert
ON public.academic_terms
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS academic_terms_tenant_update ON public.academic_terms;
CREATE POLICY academic_terms_tenant_update
ON public.academic_terms
FOR UPDATE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
)
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS academic_terms_tenant_delete ON public.academic_terms;
CREATE POLICY academic_terms_tenant_delete
ON public.academic_terms
FOR DELETE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

-- ---------------------------------------------------------------------------
-- exams + exam_grades
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  academic_year_id UUID REFERENCES public.academic_years(id) ON DELETE SET NULL,
  academic_term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  exam_date DATE,
  class_name TEXT,
  section TEXT,
  max_score NUMERIC NOT NULL DEFAULT 100,
  weight NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_exams_school_year_term ON public.exams(school_id, academic_year_id, academic_term_id);
CREATE INDEX IF NOT EXISTS idx_exams_school_class_section ON public.exams(school_id, class_name, section);
CREATE INDEX IF NOT EXISTS idx_exams_school_created ON public.exams(school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.exam_grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  exam_id UUID NOT NULL REFERENCES public.exams(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC,
  notes TEXT,
  entered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entered_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE (exam_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_grades_exam_id ON public.exam_grades(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_grades_school_student ON public.exam_grades(school_id, student_id);

ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_grades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS exams_tenant_select ON public.exams;
CREATE POLICY exams_tenant_select ON public.exams FOR SELECT TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS exams_tenant_insert ON public.exams;
CREATE POLICY exams_tenant_insert ON public.exams FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS exams_tenant_update ON public.exams;
CREATE POLICY exams_tenant_update ON public.exams FOR UPDATE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id())
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS exams_tenant_delete ON public.exams;
CREATE POLICY exams_tenant_delete ON public.exams FOR DELETE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());

DROP POLICY IF EXISTS exam_grades_tenant_select ON public.exam_grades;
CREATE POLICY exam_grades_tenant_select ON public.exam_grades FOR SELECT TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS exam_grades_tenant_insert ON public.exam_grades;
CREATE POLICY exam_grades_tenant_insert ON public.exam_grades FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS exam_grades_tenant_update ON public.exam_grades;
CREATE POLICY exam_grades_tenant_update ON public.exam_grades FOR UPDATE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id())
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS exam_grades_tenant_delete ON public.exam_grades;
CREATE POLICY exam_grades_tenant_delete ON public.exam_grades FOR DELETE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());

-- ---------------------------------------------------------------------------
-- guardians + student_guardians
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  national_id TEXT,
  notes TEXT,
  deleted_at TIMESTAMPTZ NULL,
  deleted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_guardians_school_name ON public.guardians(school_id, full_name);
CREATE INDEX IF NOT EXISTS idx_guardians_school_created ON public.guardians(school_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.student_guardians (
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  relationship TEXT,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  PRIMARY KEY (student_id, guardian_id)
);

CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_school ON public.student_guardians(school_id);

CREATE OR REPLACE FUNCTION public.set_student_guardians_school_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.school_id IS NULL OR NEW.school_id IS DISTINCT FROM (
    SELECT s.school_id FROM public.students s WHERE s.id = NEW.student_id
  ) THEN
    SELECT s.school_id INTO NEW.school_id
    FROM public.students s
    WHERE s.id = NEW.student_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_student_guardians_school_id ON public.student_guardians;
CREATE TRIGGER trg_student_guardians_school_id
BEFORE INSERT OR UPDATE OF student_id ON public.student_guardians
FOR EACH ROW
EXECUTE FUNCTION public.set_student_guardians_school_id();

ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guardians_tenant_select ON public.guardians;
CREATE POLICY guardians_tenant_select ON public.guardians FOR SELECT TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS guardians_tenant_insert ON public.guardians;
CREATE POLICY guardians_tenant_insert ON public.guardians FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS guardians_tenant_update ON public.guardians;
CREATE POLICY guardians_tenant_update ON public.guardians FOR UPDATE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id())
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS guardians_tenant_delete ON public.guardians;
CREATE POLICY guardians_tenant_delete ON public.guardians FOR DELETE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());

DROP POLICY IF EXISTS student_guardians_tenant_select ON public.student_guardians;
CREATE POLICY student_guardians_tenant_select ON public.student_guardians FOR SELECT TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS student_guardians_tenant_insert ON public.student_guardians;
CREATE POLICY student_guardians_tenant_insert ON public.student_guardians FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS student_guardians_tenant_update ON public.student_guardians;
CREATE POLICY student_guardians_tenant_update ON public.student_guardians FOR UPDATE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id())
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS student_guardians_tenant_delete ON public.student_guardians;
CREATE POLICY student_guardians_tenant_delete ON public.student_guardians FOR DELETE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());

-- ---------------------------------------------------------------------------
-- school_settings (one row per school)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.school_settings (
  school_id UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.school_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS school_settings_tenant_select ON public.school_settings;
CREATE POLICY school_settings_tenant_select ON public.school_settings FOR SELECT TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS school_settings_tenant_insert ON public.school_settings;
CREATE POLICY school_settings_tenant_insert ON public.school_settings FOR INSERT TO authenticated
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS school_settings_tenant_update ON public.school_settings;
CREATE POLICY school_settings_tenant_update ON public.school_settings FOR UPDATE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id())
WITH CHECK (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());
DROP POLICY IF EXISTS school_settings_tenant_delete ON public.school_settings;
CREATE POLICY school_settings_tenant_delete ON public.school_settings FOR DELETE TO authenticated
USING (public.current_app_role() = 'super_admin' OR school_id = public.current_school_id());

-- ---------------------------------------------------------------------------
-- Optional: teacher list indexes (safe if already present)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_teachers_school_full_name ON public.teachers(school_id, full_name);
CREATE INDEX IF NOT EXISTS idx_teachers_school_status ON public.teachers(school_id, status);
