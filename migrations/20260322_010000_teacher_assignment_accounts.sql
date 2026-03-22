BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS classes_taught JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_name_unique
  ON public.subjects(school_id, name);

CREATE INDEX IF NOT EXISTS idx_subjects_school_id
  ON public.subjects(school_id, is_active);

CREATE TABLE IF NOT EXISTS public.teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
  section_id UUID NULL REFERENCES public.sections(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_assignments_unique_classwide
  ON public.teacher_assignments(school_id, teacher_id, subject_id, class_id)
  WHERE section_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_assignments_unique_section
  ON public.teacher_assignments(school_id, teacher_id, subject_id, class_id, section_id)
  WHERE section_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher_id
  ON public.teacher_assignments(teacher_id, is_active);

CREATE INDEX IF NOT EXISTS idx_teacher_assignments_school_scope
  ON public.teacher_assignments(school_id, class_id, section_id, subject_id);

CREATE TABLE IF NOT EXISTS public.managed_user_credentials (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  login_identifier TEXT NOT NULL,
  temporary_password TEXT NOT NULL,
  password_last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_last_printed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_credentials_school_login_unique
  ON public.managed_user_credentials(school_id, login_identifier);

CREATE INDEX IF NOT EXISTS idx_managed_user_credentials_school_id
  ON public.managed_user_credentials(school_id);

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

DROP TRIGGER IF EXISTS trg_subjects_updated_at ON public.subjects;
CREATE TRIGGER trg_subjects_updated_at
BEFORE UPDATE ON public.subjects
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

DROP TRIGGER IF EXISTS trg_teacher_assignments_updated_at ON public.teacher_assignments;
CREATE TRIGGER trg_teacher_assignments_updated_at
BEFORE UPDATE ON public.teacher_assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

DROP TRIGGER IF EXISTS trg_managed_user_credentials_updated_at ON public.managed_user_credentials;
CREATE TRIGGER trg_managed_user_credentials_updated_at
BEFORE UPDATE ON public.managed_user_credentials
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_user_credentials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subjects_admin_manage_policy ON public.subjects;
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
);

DROP POLICY IF EXISTS teacher_assignments_admin_manage_policy ON public.teacher_assignments;
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
);

DROP POLICY IF EXISTS managed_user_credentials_admin_manage_policy ON public.managed_user_credentials;
CREATE POLICY managed_user_credentials_admin_manage_policy
ON public.managed_user_credentials
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
);

DO $$
BEGIN
  IF to_regprocedure('public.current_managed_role()') IS NOT NULL
     AND to_regprocedure('public.current_managed_school_id()') IS NOT NULL
     AND to_regprocedure('public.current_managed_teacher_id()') IS NOT NULL
     AND to_regprocedure('public.current_managed_is_active()') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS subjects_managed_select_policy ON public.subjects';
    EXECUTE $policy$
      CREATE POLICY subjects_managed_select_policy
      ON public.subjects
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS teacher_assignments_managed_teacher_select ON public.teacher_assignments';
    EXECUTE $policy$
      CREATE POLICY teacher_assignments_managed_teacher_select
      ON public.teacher_assignments
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
        AND teacher_id = public.current_managed_teacher_id()
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS classes_managed_select_policy ON public.classes';
    EXECUTE $policy$
      CREATE POLICY classes_managed_select_policy
      ON public.classes
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS sections_managed_select_policy ON public.sections';
    EXECUTE $policy$
      CREATE POLICY sections_managed_select_policy
      ON public.sections
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
      )
    $policy$;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_access_class(target_class_name TEXT, target_section TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_uuid UUID;
  allowed BOOLEAN := FALSE;
BEGIN
  IF public.current_managed_role() <> 'teacher' OR NOT public.current_managed_is_active() THEN
    RETURN FALSE;
  END IF;

  IF target_class_name IS NULL OR btrim(target_class_name) = '' THEN
    RETURN FALSE;
  END IF;

  teacher_uuid := public.current_managed_teacher_id();
  IF teacher_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF to_regclass('public.teacher_assignments') IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM public.teacher_assignments AS ta
      INNER JOIN public.classes AS c
        ON c.id = ta.class_id
      LEFT JOIN public.sections AS s
        ON s.id = ta.section_id
      WHERE ta.teacher_id = teacher_uuid
        AND ta.school_id = public.current_managed_school_id()
        AND COALESCE(ta.is_active, TRUE)
        AND lower(c.name) = lower(target_class_name)
        AND (
          (
            (target_section IS NULL OR btrim(target_section) = '')
            AND ta.section_id IS NULL
          )
          OR (
            target_section IS NOT NULL
            AND btrim(target_section) <> ''
            AND (
              ta.section_id IS NULL
              OR lower(COALESCE(s.name, '')) = lower(target_section)
            )
          )
        )
    ) INTO allowed;

    IF COALESCE(allowed, FALSE) THEN
      RETURN TRUE;
    END IF;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'teachers'
      AND column_name = 'classes_taught'
  ) THEN
    RETURN FALSE;
  END IF;

  BEGIN
    EXECUTE $sql$
      SELECT EXISTS (
        SELECT 1
        FROM public.teachers AS t
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN t.classes_taught IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(to_jsonb(t.classes_taught)) = 'array' THEN to_jsonb(t.classes_taught)
            WHEN jsonb_typeof(to_jsonb(t.classes_taught)) = 'string' THEN COALESCE(NULLIF(t.classes_taught::text, '')::jsonb, '[]'::jsonb)
            ELSE '[]'::jsonb
          END
        ) AS assignment(value)
        WHERE t.id = $1
          AND lower(
            COALESCE(
              NULLIF(assignment.value->>'grade', ''),
              NULLIF(assignment.value->>'class_name', ''),
              NULLIF(assignment.value->>'class', '')
            )
          ) = lower($2)
          AND (
            (
              COALESCE($3, '') = ''
              AND COALESCE(
                NULLIF(lower(assignment.value->>'section'), ''),
                NULLIF(lower(assignment.value->>'group'), '')
              ) IS NULL
            )
            OR (
              COALESCE($3, '') <> ''
              AND (
                COALESCE(
                  NULLIF(lower(assignment.value->>'section'), ''),
                  NULLIF(lower(assignment.value->>'group'), '')
                ) IS NULL
                OR COALESCE(
                  NULLIF(lower(assignment.value->>'section'), ''),
                  NULLIF(lower(assignment.value->>'group'), '')
                ) = lower(COALESCE($3, ''))
              )
            )
          )
      )
    $sql$
    INTO allowed
    USING teacher_uuid, target_class_name, target_section;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN FALSE;
  END;

  RETURN COALESCE(allowed, FALSE);
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_access_subject_scope(
  target_subject TEXT,
  target_class_name TEXT,
  target_section TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  teacher_uuid UUID;
BEGIN
  IF target_subject IS NULL OR btrim(target_subject) = '' THEN
    RETURN public.teacher_can_access_class(target_class_name, target_section);
  END IF;

  IF public.current_managed_role() <> 'teacher' OR NOT public.current_managed_is_active() THEN
    RETURN FALSE;
  END IF;

  teacher_uuid := public.current_managed_teacher_id();
  IF teacher_uuid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF to_regclass('public.teacher_assignments') IS NULL THEN
    RETURN public.teacher_can_access_class(target_class_name, target_section);
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.teacher_assignments AS ta
    INNER JOIN public.subjects AS sb
      ON sb.id = ta.subject_id
    INNER JOIN public.classes AS c
      ON c.id = ta.class_id
    LEFT JOIN public.sections AS s
      ON s.id = ta.section_id
    WHERE ta.teacher_id = teacher_uuid
      AND ta.school_id = public.current_managed_school_id()
      AND COALESCE(ta.is_active, TRUE)
      AND lower(sb.name) = lower(target_subject)
      AND lower(c.name) = lower(COALESCE(target_class_name, ''))
      AND (
        (
          (target_section IS NULL OR btrim(target_section) = '')
          AND ta.section_id IS NULL
        )
        OR (
          target_section IS NOT NULL
          AND btrim(target_section) <> ''
          AND (
            ta.section_id IS NULL
            OR lower(COALESCE(s.name, '')) = lower(target_section)
          )
        )
      )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_write_assignment(
  target_school_id UUID,
  target_student_id UUID,
  target_class_name TEXT,
  target_section TEXT,
  target_subject TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_managed_role() = 'teacher'
    AND public.current_managed_is_active()
    AND target_school_id = public.current_managed_school_id()
    AND public.teacher_can_access_subject_scope(target_subject, target_class_name, target_section)
    AND (
      target_student_id IS NULL
      OR public.teacher_can_access_student(target_student_id)
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_write_grade(
  target_school_id UUID,
  target_student_id UUID,
  target_subject TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_class_name TEXT;
  student_section TEXT;
BEGIN
  IF target_school_id IS NULL OR target_student_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF public.current_managed_role() <> 'teacher' OR NOT public.current_managed_is_active() THEN
    RETURN FALSE;
  END IF;

  IF target_school_id <> public.current_managed_school_id() THEN
    RETURN FALSE;
  END IF;

  IF NOT public.teacher_can_access_student(target_student_id) THEN
    RETURN FALSE;
  END IF;

  SELECT s.class_name, s.section
  INTO student_class_name, student_section
  FROM public.students AS s
  WHERE s.id = target_student_id
  LIMIT 1;

  RETURN public.teacher_can_access_subject_scope(target_subject, student_class_name, student_section);
END;
$$;

GRANT EXECUTE ON FUNCTION public.teacher_can_access_subject_scope(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_write_assignment(UUID, UUID, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_write_grade(UUID, UUID, TEXT) TO authenticated;

DO $$
BEGIN
  IF to_regclass('public.assignments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_teacher_insert ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_teacher_insert
      ON public.assignments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.teacher_can_write_assignment(school_id, student_id, class_name, section, subject)
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_teacher_update ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_teacher_update
      ON public.assignments
      FOR UPDATE
      TO authenticated
      USING (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND teacher_id = public.current_managed_teacher_id()
      )
      WITH CHECK (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND teacher_id = public.current_managed_teacher_id()
        AND public.teacher_can_write_assignment(school_id, student_id, class_name, section, subject)
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_teacher_select ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_teacher_select
      ON public.assignments
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
        AND teacher_id = public.current_managed_teacher_id()
      )
    $policy$;
  END IF;

  IF to_regclass('public.grades') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS grades_managed_teacher_insert ON public.grades';
    EXECUTE $policy$
      CREATE POLICY grades_managed_teacher_insert
      ON public.grades
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.teacher_can_write_grade(school_id, student_id, subject)
        AND teacher_id = public.current_managed_teacher_id()
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS grades_managed_teacher_update ON public.grades';
    EXECUTE $policy$
      CREATE POLICY grades_managed_teacher_update
      ON public.grades
      FOR UPDATE
      TO authenticated
      USING (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND teacher_id = public.current_managed_teacher_id()
      )
      WITH CHECK (
        public.teacher_can_write_grade(school_id, student_id, subject)
        AND teacher_id = public.current_managed_teacher_id()
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS grades_managed_teacher_select ON public.grades';
    EXECUTE $policy$
      CREATE POLICY grades_managed_teacher_select
      ON public.grades
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
        AND teacher_id = public.current_managed_teacher_id()
      )
    $policy$;
  END IF;
END
$$;

COMMIT;
