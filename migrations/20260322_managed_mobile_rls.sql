BEGIN;

CREATE OR REPLACE FUNCTION public.current_managed_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.managed_user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_managed_school_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.managed_user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_managed_student_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT student_id
  FROM public.managed_user_profiles
  WHERE auth_user_id = auth.uid()
    AND role = 'student'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_managed_teacher_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT teacher_id
  FROM public.managed_user_profiles
  WHERE auth_user_id = auth.uid()
    AND role = 'teacher'
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_managed_is_active()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(is_active, FALSE)
  FROM public.managed_user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_managed_student_class_name()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT class_name
  FROM public.students
  WHERE id = public.current_managed_student_id()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_managed_student_section()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT section
  FROM public.students
  WHERE id = public.current_managed_student_id()
  LIMIT 1;
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

CREATE OR REPLACE FUNCTION public.teacher_can_access_student(target_student_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  student_class_name TEXT;
  student_section TEXT;
  student_school_id UUID;
BEGIN
  IF public.current_managed_role() <> 'teacher' OR NOT public.current_managed_is_active() THEN
    RETURN FALSE;
  END IF;

  SELECT s.class_name, s.section, s.school_id
  INTO student_class_name, student_section, student_school_id
  FROM public.students AS s
  WHERE s.id = target_student_id
  LIMIT 1;

  IF student_school_id IS NULL OR student_school_id <> public.current_managed_school_id() THEN
    RETURN FALSE;
  END IF;

  RETURN public.teacher_can_access_class(student_class_name, student_section);
END;
$$;

CREATE OR REPLACE FUNCTION public.student_can_read_assignment(
  target_school_id UUID,
  target_student_id UUID,
  target_class_name TEXT,
  target_section TEXT
)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.current_managed_role() = 'student'
    AND public.current_managed_is_active()
    AND (
      target_student_id = public.current_managed_student_id()
      OR (
        target_student_id IS NULL
        AND target_school_id = public.current_managed_school_id()
        AND (
          target_class_name IS NULL
          OR lower(target_class_name) = lower(COALESCE(public.current_managed_student_class_name(), ''))
        )
        AND (
          target_section IS NULL
          OR lower(target_section) = lower(COALESCE(public.current_managed_student_section(), ''))
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_read_assignment(
  target_school_id UUID,
  target_student_id UUID,
  target_class_name TEXT,
  target_section TEXT
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
    AND (
      target_student_id IS NULL
      OR public.teacher_can_access_student(target_student_id)
    )
    AND (
      (target_class_name IS NULL AND target_section IS NULL)
      OR public.teacher_can_access_class(target_class_name, target_section)
      OR (
        target_class_name IS NULL
        AND target_section IS NOT NULL
        AND EXISTS (
          SELECT 1
          FROM public.students AS s
          WHERE s.school_id = public.current_managed_school_id()
            AND public.teacher_can_access_student(s.id)
            AND lower(COALESCE(s.section, '')) = lower(target_section)
        )
      )
    );
$$;

CREATE OR REPLACE FUNCTION public.teacher_can_write_assignment(
  target_school_id UUID,
  target_student_id UUID,
  target_class_name TEXT,
  target_section TEXT
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
    AND (
      (target_student_id IS NOT NULL AND public.teacher_can_access_student(target_student_id))
      OR (
        target_student_id IS NULL
        AND public.teacher_can_access_class(target_class_name, target_section)
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.current_managed_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_managed_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_managed_student_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_managed_teacher_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_managed_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_managed_student_class_name() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_managed_student_section() TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_class(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_access_student(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_can_read_assignment(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_read_assignment(UUID, UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.teacher_can_write_assignment(UUID, UUID, TEXT, TEXT) TO authenticated;

ALTER TABLE public.managed_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS managed_user_profiles_self_select ON public.managed_user_profiles;
CREATE POLICY managed_user_profiles_self_select
ON public.managed_user_profiles
FOR SELECT
TO authenticated
USING (auth_user_id = auth.uid());

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS students_managed_student_select ON public.students;
CREATE POLICY students_managed_student_select
ON public.students
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'student'
  AND public.current_managed_is_active()
  AND id = public.current_managed_student_id()
);

DROP POLICY IF EXISTS students_managed_teacher_select ON public.students;
CREATE POLICY students_managed_teacher_select
ON public.students
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND public.current_managed_is_active()
  AND public.teacher_can_access_student(id)
);

ALTER TABLE public.teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_managed_teacher_self_select ON public.teachers;
CREATE POLICY teachers_managed_teacher_self_select
ON public.teachers
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND public.current_managed_is_active()
  AND id = public.current_managed_teacher_id()
);

DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS payments_managed_student_select ON public.payments';
    EXECUTE $policy$
      CREATE POLICY payments_managed_student_select
      ON public.payments
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_role() = ''student''
        AND public.current_managed_is_active()
        AND student_id = public.current_managed_student_id()
      )
    $policy$;
  END IF;
END
$$;

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS attendance_managed_student_select ON public.attendance_records;
CREATE POLICY attendance_managed_student_select
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'student'
  AND public.current_managed_is_active()
  AND student_id = public.current_managed_student_id()
);

DROP POLICY IF EXISTS attendance_managed_teacher_select ON public.attendance_records;
CREATE POLICY attendance_managed_teacher_select
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND public.current_managed_is_active()
  AND public.teacher_can_access_student(student_id)
);

DROP POLICY IF EXISTS attendance_managed_teacher_insert ON public.attendance_records;
CREATE POLICY attendance_managed_teacher_insert
ON public.attendance_records
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_managed_role() = 'teacher'
  AND public.current_managed_is_active()
  AND school_id = public.current_managed_school_id()
  AND public.teacher_can_access_student(student_id)
);

DROP POLICY IF EXISTS attendance_managed_teacher_update ON public.attendance_records;
CREATE POLICY attendance_managed_teacher_update
ON public.attendance_records
FOR UPDATE
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND public.current_managed_is_active()
  AND public.teacher_can_access_student(student_id)
)
WITH CHECK (
  public.current_managed_role() = 'teacher'
  AND public.current_managed_is_active()
  AND school_id = public.current_managed_school_id()
  AND public.teacher_can_access_student(student_id)
);

DO $$
DECLARE
  has_assignments BOOLEAN := to_regclass('public.assignments') IS NOT NULL;
  has_grades BOOLEAN := to_regclass('public.grades') IS NOT NULL;
  has_notifications BOOLEAN := to_regclass('public.notifications') IS NOT NULL;
BEGIN
  IF has_assignments THEN
    EXECUTE 'ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_student_select ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_student_select
      ON public.assignments
      FOR SELECT
      TO authenticated
      USING (
        public.student_can_read_assignment(school_id, student_id, class_name, section)
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_teacher_select ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_teacher_select
      ON public.assignments
      FOR SELECT
      TO authenticated
      USING (
        public.teacher_can_read_assignment(school_id, student_id, class_name, section)
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_teacher_insert ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_teacher_insert
      ON public.assignments
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.teacher_can_write_assignment(school_id, student_id, class_name, section)
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS assignments_managed_teacher_update ON public.assignments';
    EXECUTE $policy$
      CREATE POLICY assignments_managed_teacher_update
      ON public.assignments
      FOR UPDATE
      TO authenticated
      USING (
        public.teacher_can_read_assignment(school_id, student_id, class_name, section)
      )
      WITH CHECK (
        public.teacher_can_write_assignment(school_id, student_id, class_name, section)
      )
    $policy$;
  END IF;

  IF has_grades THEN
    EXECUTE 'ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS grades_managed_student_select ON public.grades';
    EXECUTE $policy$
      CREATE POLICY grades_managed_student_select
      ON public.grades
      FOR SELECT
      TO authenticated
      USING (
        public.current_managed_role() = ''student''
        AND public.current_managed_is_active()
        AND student_id = public.current_managed_student_id()
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
        AND public.teacher_can_access_student(student_id)
      )
    $policy$;

    EXECUTE 'DROP POLICY IF EXISTS grades_managed_teacher_insert ON public.grades';
    EXECUTE $policy$
      CREATE POLICY grades_managed_teacher_insert
      ON public.grades
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
        AND public.teacher_can_access_student(student_id)
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
        AND public.teacher_can_access_student(student_id)
      )
      WITH CHECK (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
        AND public.teacher_can_access_student(student_id)
      )
    $policy$;
  END IF;

  IF has_notifications THEN
    EXECUTE 'ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS notifications_managed_teacher_insert ON public.notifications';
    EXECUTE $policy$
      CREATE POLICY notifications_managed_teacher_insert
      ON public.notifications
      FOR INSERT
      TO authenticated
      WITH CHECK (
        public.current_managed_role() = ''teacher''
        AND public.current_managed_is_active()
        AND school_id = public.current_managed_school_id()
        AND EXISTS (
          SELECT 1
          FROM public.managed_user_profiles AS mup
          WHERE mup.auth_user_id = notifications.user_id
            AND mup.role = ''student''
            AND mup.school_id = notifications.school_id
            AND public.teacher_can_access_student(mup.student_id)
        )
      )
    $policy$;
  END IF;
END
$$;

COMMIT;
