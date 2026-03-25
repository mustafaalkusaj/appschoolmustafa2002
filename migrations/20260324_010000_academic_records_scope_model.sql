-- Shared academic records schema for assignments and grades.
-- Safe to apply on projects that are missing part or all of the earlier academic migrations.

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

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.subjects
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.subjects
  ADD COLUMN IF NOT EXISTS name TEXT;

ALTER TABLE IF EXISTS public.subjects
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE IF EXISTS public.subjects
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.subjects
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_subjects_school_id
  ON public.subjects(school_id);

CREATE INDEX IF NOT EXISTS idx_subjects_school_name
  ON public.subjects(school_id, name);

CREATE INDEX IF NOT EXISTS idx_subjects_school_status
  ON public.subjects(school_id, is_active);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID NULL REFERENCES public.sections(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.teacher_assignments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_teacher_assignments_updated_at ON public.teacher_assignments;
CREATE TRIGGER trg_teacher_assignments_updated_at
BEFORE UPDATE ON public.teacher_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_scope
  ON public.teacher_assignments(school_id, teacher_id, class_id, section_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id
  ON public.teacher_assignments(teacher_id, is_active);

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
  student_id UUID NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID NULL REFERENCES public.sections(id) ON DELETE SET NULL,
  class_name TEXT NULL,
  section TEXT NULL,
  subject TEXT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  due_at TIMESTAMPTZ NULL,
  content_kind TEXT NOT NULL DEFAULT 'homework',
  attachment_bucket TEXT NULL,
  attachment_path TEXT NULL,
  attachment_name TEXT NULL,
  attachment_mime_type TEXT NULL,
  attachment_size_bytes BIGINT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignments_content_kind_check CHECK (content_kind IN ('homework', 'exam_material'))
);

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS class_name TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS section TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS title TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS content_kind TEXT NOT NULL DEFAULT 'homework';

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_bucket TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_path TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_name TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_mime_type TEXT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS attachment_size_bytes BIGINT;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.assignments
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.assignments;
CREATE TRIGGER trg_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_assignments_school_created_at
  ON public.assignments(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id
  ON public.assignments(teacher_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_student_id
  ON public.assignments(student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_scope_lookup
  ON public.assignments(school_id, class_id, section_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_assignments_text_scope_lookup
  ON public.assignments(school_id, class_name, section, subject);

CREATE INDEX IF NOT EXISTS idx_assignments_due_at
  ON public.assignments(due_at DESC);

CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  assignment_id UUID NULL REFERENCES public.assignments(id) ON DELETE SET NULL,
  subject_id UUID NULL REFERENCES public.subjects(id) ON DELETE SET NULL,
  class_id UUID NULL REFERENCES public.classes(id) ON DELETE SET NULL,
  section_id UUID NULL REFERENCES public.sections(id) ON DELETE SET NULL,
  subject TEXT NULL,
  exam_type TEXT NULL,
  score NUMERIC NULL,
  max_score NUMERIC NULL,
  note TEXT NULL,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.teachers(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS student_id UUID REFERENCES public.students(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS assignment_id UUID REFERENCES public.assignments(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS subject TEXT;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS exam_type TEXT;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS score NUMERIC;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS max_score NUMERIC;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS note TEXT;

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS public.grades
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

DROP TRIGGER IF EXISTS trg_grades_updated_at ON public.grades;
CREATE TRIGGER trg_grades_updated_at
BEFORE UPDATE ON public.grades
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_grades_school_id
  ON public.grades(school_id, graded_at DESC);

CREATE INDEX IF NOT EXISTS idx_grades_teacher_id
  ON public.grades(teacher_id, graded_at DESC);

CREATE INDEX IF NOT EXISTS idx_grades_student_id
  ON public.grades(student_id, graded_at DESC);

CREATE INDEX IF NOT EXISTS idx_grades_scope_lookup
  ON public.grades(school_id, class_id, section_id, subject_id);

CREATE INDEX IF NOT EXISTS idx_grades_assignment_id
  ON public.grades(assignment_id);

UPDATE public.assignments AS assignments
SET class_name = students.class_name,
    section = COALESCE(assignments.section, students.section)
FROM public.students AS students
WHERE assignments.student_id = students.id
  AND (assignments.class_name IS NULL OR btrim(assignments.class_name) = '');

UPDATE public.assignments AS assignments
SET subject_id = subjects.id
FROM public.subjects AS subjects
WHERE assignments.subject_id IS NULL
  AND assignments.subject IS NOT NULL
  AND lower(btrim(assignments.subject)) = lower(btrim(subjects.name))
  AND assignments.school_id = subjects.school_id;

UPDATE public.grades AS grades
SET subject_id = subjects.id
FROM public.subjects AS subjects
WHERE grades.subject_id IS NULL
  AND grades.subject IS NOT NULL
  AND lower(btrim(grades.subject)) = lower(btrim(subjects.name))
  AND grades.school_id = subjects.school_id;

DO $$
DECLARE
  classes_have_school_id BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND column_name = 'school_id'
  );
  classes_have_name BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND column_name = 'name'
  );
  classes_have_grade BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND column_name = 'grade'
  );
  classes_have_section BOOLEAN := EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND column_name = 'section'
  );
BEGIN
  IF to_regclass('public.classes') IS NOT NULL THEN
    IF classes_have_name THEN
      EXECUTE $sql$
        UPDATE public.assignments AS assignments
        SET class_id = classes.id
        FROM public.classes AS classes
        WHERE assignments.class_id IS NULL
          AND assignments.class_name IS NOT NULL
          AND lower(btrim(assignments.class_name)) = lower(btrim(classes.name))
          AND (
            NOT $1
            OR assignments.school_id = classes.school_id
          )
      $sql$
      USING classes_have_school_id;
    ELSIF classes_have_grade THEN
      EXECUTE $sql$
        UPDATE public.assignments AS assignments
        SET class_id = classes.id
        FROM public.classes AS classes
        WHERE assignments.class_id IS NULL
          AND assignments.class_name IS NOT NULL
          AND lower(btrim(assignments.class_name)) = lower(btrim(classes.grade))
          AND (
            NOT $1
            OR assignments.school_id = classes.school_id
          )
          AND (
            NOT $2
            OR assignments.section IS NULL
            OR btrim(assignments.section) = ''
            OR classes.section IS NULL
            OR lower(btrim(assignments.section)) = lower(btrim(classes.section))
          )
      $sql$
      USING classes_have_school_id, classes_have_section;

      EXECUTE $sql$
        UPDATE public.grades AS grades
        SET class_id = classes.id
        FROM public.students AS students
        INNER JOIN public.classes AS classes
          ON lower(btrim(students.class_name)) = lower(btrim(classes.grade))
        WHERE grades.class_id IS NULL
          AND grades.student_id = students.id
          AND (
            NOT $1
            OR students.school_id = classes.school_id
          )
          AND (
            NOT $2
            OR students.section IS NULL
            OR btrim(students.section) = ''
            OR classes.section IS NULL
            OR lower(btrim(students.section)) = lower(btrim(classes.section))
          )
      $sql$
      USING classes_have_school_id, classes_have_section;
    END IF;
  END IF;
END
$$;

DO $$
DECLARE
  has_app_role_fn BOOLEAN := to_regprocedure('public.current_app_role()') IS NOT NULL;
  has_school_scope_fn BOOLEAN := to_regprocedure('public.current_school_id()') IS NOT NULL;
BEGIN
  IF has_app_role_fn AND has_school_scope_fn THEN
    EXECUTE 'ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY';

    EXECUTE 'DROP POLICY IF EXISTS subjects_admin_manage_policy ON public.subjects';
    EXECUTE $policy$
      CREATE POLICY subjects_admin_manage_policy
      ON public.subjects
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

    EXECUTE 'DROP POLICY IF EXISTS teacher_assignments_admin_manage_policy ON public.teacher_assignments';
    EXECUTE $policy$
      CREATE POLICY teacher_assignments_admin_manage_policy
      ON public.teacher_assignments
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

    EXECUTE 'DROP POLICY IF EXISTS assignments_admin_manage_policy ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_admin_manage_policy
      ON public.assignments
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

    EXECUTE 'DROP POLICY IF EXISTS grades_admin_manage_policy ON public.grades';
    EXECUTE $policy$
      CREATE POLICY grades_admin_manage_policy
      ON public.grades
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
