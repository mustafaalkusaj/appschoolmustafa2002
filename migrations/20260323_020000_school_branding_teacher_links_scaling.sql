-- School branding, student-teacher auto-linking, and scaling indexes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.schools ADD COLUMN IF NOT EXISTS logo_url TEXT NULL;
ALTER TABLE IF EXISTS public.schools ADD COLUMN IF NOT EXISTS primary_color TEXT NULL;
ALTER TABLE IF EXISTS public.schools ADD COLUMN IF NOT EXISTS secondary_color TEXT NULL;
ALTER TABLE IF EXISTS public.schools ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE OR REPLACE FUNCTION public.set_schools_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_schools_updated_at ON public.schools;
CREATE TRIGGER trg_schools_updated_at
BEFORE UPDATE ON public.schools
FOR EACH ROW
EXECUTE FUNCTION public.set_schools_updated_at();

CREATE TABLE IF NOT EXISTS public.student_teacher_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  linked_by TEXT NOT NULL DEFAULT 'auto',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, student_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_student_teacher_links_school_student
  ON public.student_teacher_links(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_teacher_links_school_teacher
  ON public.student_teacher_links(school_id, teacher_id);

CREATE OR REPLACE FUNCTION public.set_student_teacher_links_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_student_teacher_links_updated_at ON public.student_teacher_links;
CREATE TRIGGER trg_student_teacher_links_updated_at
BEFORE UPDATE ON public.student_teacher_links
FOR EACH ROW
EXECUTE FUNCTION public.set_student_teacher_links_updated_at();

ALTER TABLE public.student_teacher_links ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_teacher_links_select_policy ON public.student_teacher_links;
CREATE POLICY student_teacher_links_select_policy
ON public.student_teacher_links
FOR SELECT TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS student_teacher_links_modify_policy ON public.student_teacher_links;
CREATE POLICY student_teacher_links_modify_policy
ON public.student_teacher_links
FOR ALL TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
)
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DO $$
BEGIN
  IF to_regclass('public.students') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_school_status_created_at ON public.students(school_id, status, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_school_class_section ON public.students(school_id, class_name, section)';
  END IF;

  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_school_created_at ON public.payments(school_id, created_at DESC)';
  END IF;

  IF to_regclass('public.expenses') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_school_created_at ON public.expenses(school_id, created_at DESC)';
  END IF;

  IF to_regclass('public.daily_lectures') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_daily_lectures_school_teacher_date ON public.daily_lectures(school_id, teacher_id, lecture_date DESC)';
  END IF;

  IF to_regclass('public.salary_archives') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_salary_archives_school_archive_date ON public.salary_archives(school_id, archive_date DESC)';
  END IF;
END;
$$;

ALTER TABLE IF EXISTS public.teachers ADD COLUMN IF NOT EXISTS lecture_price NUMERIC NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF to_regclass('public.teachers') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'teachers'
        AND column_name = 'is_active'
    ) THEN
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teachers_school_active ON public.teachers(school_id, is_active)';
    ELSE
      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_teachers_school_id_created_at ON public.teachers(school_id, created_at DESC)';
    END IF;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.purge_old_salary_archives()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  IF to_regclass('public.salary_archives') IS NULL THEN
    RETURN 0;
  END IF;

  DELETE FROM public.salary_archives
  WHERE archive_date < NOW() - INTERVAL '5 years';

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
