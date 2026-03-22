-- Legacy filename note: `mobile` is kept only for migration-history compatibility.
-- Actual scope: shared managed-user auth/domain tables, notifications, assignments, and grades.
-- This migration is backend/schema work and does not imply Expo, React Native, iOS, or Android code.

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_auth_user_id_unique
  ON public.students(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_auth_user_id_unique
  ON public.teachers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.managed_user_profiles (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  student_id UUID NULL REFERENCES public.students(id) ON DELETE SET NULL,
  teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
  created_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT managed_user_profiles_role_relation_check CHECK (
    (role = 'student' AND student_id IS NOT NULL AND teacher_id IS NULL)
    OR
    (role = 'teacher' AND teacher_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_school_id
  ON public.managed_user_profiles(school_id);

CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_role_status
  ON public.managed_user_profiles(school_id, role, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_profiles_student_unique
  ON public.managed_user_profiles(student_id)
  WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_profiles_teacher_unique
  ON public.managed_user_profiles(teacher_id)
  WHERE teacher_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_profiles_school_email_unique
  ON public.managed_user_profiles(school_id, lower(email));

CREATE OR REPLACE FUNCTION public.set_dashboard_managed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_managed_user_profiles_updated_at ON public.managed_user_profiles;
CREATE TRIGGER trg_managed_user_profiles_updated_at
BEFORE UPDATE ON public.managed_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

ALTER TABLE public.managed_user_profiles ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF to_regprocedure('public.current_app_role()') IS NOT NULL
     AND to_regprocedure('public.current_school_id()') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS managed_user_profiles_admin_manage_policy ON public.managed_user_profiles';
    EXECUTE $policy$
      CREATE POLICY managed_user_profiles_admin_manage_policy
      ON public.managed_user_profiles
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

CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
  student_id UUID NULL REFERENCES public.students(id) ON DELETE CASCADE,
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

DROP TRIGGER IF EXISTS trg_assignments_updated_at ON public.assignments;
CREATE TRIGGER trg_assignments_updated_at
BEFORE UPDATE ON public.assignments
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_assignments_school_created_at
  ON public.assignments(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_assignments_student_id
  ON public.assignments(student_id);

CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id
  ON public.assignments(teacher_id);

CREATE INDEX IF NOT EXISTS idx_assignments_class_scope
  ON public.assignments(school_id, class_name, section);

CREATE INDEX IF NOT EXISTS idx_assignments_due_at
  ON public.assignments(due_at DESC);

CREATE TABLE IF NOT EXISTS public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  teacher_id UUID NULL REFERENCES public.teachers(id) ON DELETE SET NULL,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject TEXT NULL,
  exam_type TEXT NULL,
  score NUMERIC NULL,
  max_score NUMERIC NULL,
  note TEXT NULL,
  graded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

DROP TRIGGER IF EXISTS trg_grades_updated_at ON public.grades;
CREATE TRIGGER trg_grades_updated_at
BEFORE UPDATE ON public.grades
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

CREATE INDEX IF NOT EXISTS idx_grades_student_id
  ON public.grades(student_id, graded_at DESC);

CREATE INDEX IF NOT EXISTS idx_grades_teacher_id
  ON public.grades(teacher_id, graded_at DESC);

CREATE INDEX IF NOT EXISTS idx_grades_school_id
  ON public.grades(school_id, graded_at DESC);

CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid()
);

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id) ON DELETE CASCADE;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'teacher_broadcast';

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT 'إشعار';

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS link TEXT NULL;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE IF EXISTS public.notifications
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_notifications_user_id
  ON public.notifications(user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read
  ON public.notifications(is_read);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_owner_all ON public.notifications;
CREATE POLICY notifications_owner_all
ON public.notifications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

WITH teacher_candidates AS (
  SELECT
    t.id AS teacher_id,
    up.id AS auth_user_id
  FROM public.teachers AS t
  JOIN public.user_profiles AS up
    ON up.school_id = t.school_id
   AND lower(COALESCE(up.role, '')) = 'teacher'
   AND (
     (
       COALESCE(NULLIF(lower(btrim(t.email)), ''), '') <> ''
       AND lower(btrim(t.email)) = lower(btrim(COALESCE(up.email, '')))
     )
     OR (
       COALESCE(NULLIF(btrim(t.phone), ''), '') <> ''
       AND btrim(t.phone) = btrim(COALESCE(up.phone, ''))
     )
     OR (
       COALESCE(NULLIF(lower(btrim(t.full_name)), ''), '') <> ''
       AND lower(btrim(t.full_name)) = lower(btrim(COALESCE(up.full_name, '')))
     )
   )
),
unique_teacher_candidates AS (
  SELECT teacher_id, MIN(auth_user_id) AS auth_user_id
  FROM teacher_candidates
  GROUP BY teacher_id
  HAVING COUNT(*) = 1
)
UPDATE public.teachers AS t
SET auth_user_id = c.auth_user_id
FROM unique_teacher_candidates AS c
WHERE t.id = c.teacher_id
  AND t.auth_user_id IS NULL;

WITH student_candidates AS (
  SELECT
    s.id AS student_id,
    up.id AS auth_user_id
  FROM public.students AS s
  JOIN public.user_profiles AS up
    ON up.school_id = s.school_id
   AND lower(COALESCE(up.role, '')) = 'student'
   AND (
     (
       COALESCE(NULLIF(btrim(s.phone), ''), '') <> ''
       AND btrim(s.phone) = btrim(COALESCE(up.phone, ''))
     )
     OR (
       COALESCE(NULLIF(btrim(s.guardian_phone), ''), '') <> ''
       AND btrim(s.guardian_phone) = btrim(COALESCE(up.phone, ''))
     )
     OR (
       COALESCE(NULLIF(lower(btrim(s.full_name)), ''), '') <> ''
       AND lower(btrim(s.full_name)) = lower(btrim(COALESCE(up.full_name, '')))
     )
   )
),
unique_student_candidates AS (
  SELECT student_id, MIN(auth_user_id) AS auth_user_id
  FROM student_candidates
  GROUP BY student_id
  HAVING COUNT(*) = 1
)
UPDATE public.students AS s
SET auth_user_id = c.auth_user_id
FROM unique_student_candidates AS c
WHERE s.id = c.student_id
  AND s.auth_user_id IS NULL;

INSERT INTO public.managed_user_profiles (
  auth_user_id,
  school_id,
  role,
  full_name,
  email,
  phone,
  is_active,
  student_id,
  teacher_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  t.auth_user_id,
  t.school_id,
  'teacher',
  COALESCE(NULLIF(btrim(t.full_name), ''), 'معلم'),
  COALESCE(NULLIF(au.email, ''), 'teacher-' || t.id::text || '@local.invalid'),
  COALESCE(NULLIF(btrim(t.phone), ''), NULLIF(au.phone, '')),
  CASE
    WHEN lower(COALESCE(t.status, 'active')) IN ('deleted', 'inactive') THEN FALSE
    ELSE TRUE
  END,
  NULL,
  t.id,
  t.auth_user_id,
  COALESCE(t.created_at, NOW()),
  NOW()
FROM public.teachers AS t
LEFT JOIN auth.users AS au
  ON au.id = t.auth_user_id
WHERE t.auth_user_id IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE
SET
  school_id = EXCLUDED.school_id,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  student_id = EXCLUDED.student_id,
  teacher_id = EXCLUDED.teacher_id,
  updated_at = NOW();

INSERT INTO public.managed_user_profiles (
  auth_user_id,
  school_id,
  role,
  full_name,
  email,
  phone,
  is_active,
  student_id,
  teacher_id,
  created_by,
  created_at,
  updated_at
)
SELECT
  s.auth_user_id,
  s.school_id,
  'student',
  COALESCE(NULLIF(btrim(s.full_name), ''), 'طالب'),
  COALESCE(NULLIF(au.email, ''), 'student-' || s.id::text || '@local.invalid'),
  COALESCE(NULLIF(btrim(s.phone), ''), NULLIF(au.phone, '')),
  CASE
    WHEN lower(COALESCE(s.status, 'active')) IN ('deleted', 'inactive') THEN FALSE
    ELSE TRUE
  END,
  s.id,
  NULL,
  s.auth_user_id,
  COALESCE(s.created_at, NOW()),
  NOW()
FROM public.students AS s
LEFT JOIN auth.users AS au
  ON au.id = s.auth_user_id
WHERE s.auth_user_id IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE
SET
  school_id = EXCLUDED.school_id,
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  phone = EXCLUDED.phone,
  is_active = EXCLUDED.is_active,
  student_id = EXCLUDED.student_id,
  teacher_id = EXCLUDED.teacher_id,
  updated_at = NOW();

COMMIT;
