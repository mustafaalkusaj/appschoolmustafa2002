BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE IF EXISTS public.students
  ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE IF EXISTS public.teachers
  ADD COLUMN IF NOT EXISTS classes_taught JSONB NOT NULL DEFAULT '[]'::jsonb;

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

DROP TRIGGER IF EXISTS trg_managed_user_profiles_updated_at ON public.managed_user_profiles;
CREATE TRIGGER trg_managed_user_profiles_updated_at
BEFORE UPDATE ON public.managed_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

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

COMMIT;
