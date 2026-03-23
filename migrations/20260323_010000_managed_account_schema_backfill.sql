BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS specialization TEXT NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS notes TEXT NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS classes_taught JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_auth_user_id_unique
  ON public.students(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_auth_user_id_unique
  ON public.teachers(auth_user_id)
  WHERE auth_user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_dashboard_managed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

DROP TRIGGER IF EXISTS trg_managed_user_profiles_updated_at ON public.managed_user_profiles;
CREATE TRIGGER trg_managed_user_profiles_updated_at
BEFORE UPDATE ON public.managed_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

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

DROP TRIGGER IF EXISTS trg_managed_user_credentials_updated_at ON public.managed_user_credentials;
CREATE TRIGGER trg_managed_user_credentials_updated_at
BEFORE UPDATE ON public.managed_user_credentials
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

ALTER TABLE public.managed_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.managed_user_credentials ENABLE ROW LEVEL SECURITY;

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

    EXECUTE 'DROP POLICY IF EXISTS managed_user_credentials_admin_manage_policy ON public.managed_user_credentials';
    EXECUTE $policy$
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
      )
    $policy$;
  END IF;
END
$$;

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
  up.id,
  COALESCE(up.school_id, s.school_id, t.school_id),
  CASE
    WHEN lower(COALESCE(up.role, '')) = 'student' THEN 'student'
    ELSE 'teacher'
  END,
  COALESCE(NULLIF(btrim(up.full_name), ''), NULLIF(btrim(COALESCE(s.full_name, t.full_name)), ''), 'مستخدم'),
  COALESCE(
    NULLIF(lower(btrim(COALESCE(up.email, au.email))), ''),
    CASE
      WHEN lower(COALESCE(up.role, '')) = 'student' THEN 'student-' || up.id::text || '@local.invalid'
      ELSE 'teacher-' || up.id::text || '@local.invalid'
    END
  ),
  COALESCE(NULLIF(btrim(up.phone), ''), NULLIF(btrim(COALESCE(s.phone, t.phone)), '')),
  COALESCE(
    up.is_active,
    CASE
      WHEN lower(COALESCE(t.status, 'active')) IN ('inactive', 'deleted') THEN FALSE
      WHEN lower(COALESCE(s.status, 'active')) IN ('inactive', 'deleted') THEN FALSE
      ELSE TRUE
    END
  ),
  CASE WHEN lower(COALESCE(up.role, '')) = 'student' THEN s.id ELSE NULL END,
  CASE WHEN lower(COALESCE(up.role, '')) = 'teacher' THEN t.id ELSE NULL END,
  up.id,
  COALESCE(up.created_at, NOW()),
  NOW()
FROM public.user_profiles AS up
LEFT JOIN public.students AS s
  ON s.auth_user_id = up.id
LEFT JOIN public.teachers AS t
  ON t.auth_user_id = up.id
LEFT JOIN auth.users AS au
  ON au.id = up.id
WHERE lower(COALESCE(up.role, '')) IN ('student', 'teacher')
  AND COALESCE(up.school_id, s.school_id, t.school_id) IS NOT NULL
  AND (
    (lower(COALESCE(up.role, '')) = 'student' AND s.id IS NOT NULL)
    OR
    (lower(COALESCE(up.role, '')) = 'teacher' AND t.id IS NOT NULL)
  )
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

INSERT INTO public.managed_user_credentials (
  auth_user_id,
  school_id,
  login_identifier,
  temporary_password,
  password_last_reset_at,
  card_last_printed_at,
  created_at,
  updated_at
)
SELECT
  mup.auth_user_id,
  mup.school_id,
  NULLIF(COALESCE(
    au.raw_app_meta_data -> 'managed_credentials' ->> 'login_identifier',
    au.raw_user_meta_data ->> 'loginIdentifier',
    au.email
  ), ''),
  NULLIF(au.raw_app_meta_data -> 'managed_credentials' ->> 'temporary_password', ''),
  COALESCE(
    NULLIF(au.raw_app_meta_data -> 'managed_credentials' ->> 'password_last_reset_at', '')::timestamptz,
    NOW()
  ),
  NULLIF(au.raw_app_meta_data -> 'managed_credentials' ->> 'card_last_printed_at', '')::timestamptz,
  NOW(),
  NOW()
FROM public.managed_user_profiles AS mup
JOIN auth.users AS au
  ON au.id = mup.auth_user_id
WHERE NULLIF(COALESCE(
    au.raw_app_meta_data -> 'managed_credentials' ->> 'login_identifier',
    au.raw_user_meta_data ->> 'loginIdentifier',
    au.email
  ), '') IS NOT NULL
  AND NULLIF(au.raw_app_meta_data -> 'managed_credentials' ->> 'temporary_password', '') IS NOT NULL
ON CONFLICT (auth_user_id) DO UPDATE
SET
  school_id = EXCLUDED.school_id,
  login_identifier = EXCLUDED.login_identifier,
  temporary_password = EXCLUDED.temporary_password,
  password_last_reset_at = EXCLUDED.password_last_reset_at,
  card_last_printed_at = EXCLUDED.card_last_printed_at,
  updated_at = NOW();

COMMIT;
