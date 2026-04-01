-- Shared Supabase bootstrap for the web admin app and shared backend/domain logic.
-- This file is database-only and should not be used to justify mobile UI code in this repo.

-- ملاحظة: هذا السكربت مكتوب لـ PostgreSQL (Supabase) وليس SQL Server / MySQL.
-- تأكد من تشغيله داخل Supabase Dashboard → SQL Editor.

-- لتوفير gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- إنشاء جدول الصفوف
CREATE TABLE IF NOT EXISTS classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إنشاء جدول الشعب
CREATE TABLE IF NOT EXISTS sections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(class_id, name)
);

-- إضافة عمود section إلى جدول students
ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS section TEXT;

-- إنشاء جدول الحضور اليومي
CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  school_id UUID NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
  attendance_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  note TEXT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, attendance_date)
);

-- فهارس لتحسين الأداء في صفحة الحضور
CREATE INDEX IF NOT EXISTS idx_attendance_records_date ON attendance_records(attendance_date);
CREATE INDEX IF NOT EXISTS idx_attendance_records_student ON attendance_records(student_id);

-- دالة/تريكر لتحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION set_attendance_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_attendance_records_updated_at ON attendance_records;
CREATE TRIGGER trg_attendance_records_updated_at
BEFORE UPDATE ON attendance_records
FOR EACH ROW
EXECUTE FUNCTION set_attendance_records_updated_at();

-- تفعيل RLS على جدول الحضور
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;

-- إزالة السياسات المفتوحة القديمة إن وجدت
DROP POLICY IF EXISTS attendance_records_select_auth ON attendance_records;
DROP POLICY IF EXISTS attendance_records_insert_auth ON attendance_records;
DROP POLICY IF EXISTS attendance_records_update_auth ON attendance_records;
DROP POLICY IF EXISTS attendance_records_delete_auth ON attendance_records;

-- ============================================================================
-- RBAC + Multi-Tenant Core (Schools / Subscriptions / User Profiles)
-- ============================================================================

CREATE TABLE IF NOT EXISTS schools (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  subscription_end DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE schools ADD COLUMN IF NOT EXISTS address TEXT NULL;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS phone TEXT NULL;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS owner_email TEXT NULL;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS city TEXT NULL;
ALTER TABLE schools ADD COLUMN IF NOT EXISTS plan TEXT NULL DEFAULT 'basic';

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  plan TEXT NOT NULL DEFAULT 'basic',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended', 'inactive')),
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON subscriptions(school_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

CREATE OR REPLACE FUNCTION public.recompute_school_subscription_end(target_school_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.schools
  SET subscription_end = (
    SELECT sub.end_date
    FROM public.subscriptions AS sub
    WHERE sub.school_id = target_school_id
    ORDER BY sub.created_at DESC, sub.start_date DESC, sub.id DESC
    LIMIT 1
  )
  WHERE id = target_school_id;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.sync_school_subscription_end_from_subscriptions()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.recompute_school_subscription_end(OLD.school_id);
    RETURN OLD;
  END IF;

  PERFORM public.recompute_school_subscription_end(NEW.school_id);

  IF TG_OP = 'UPDATE' AND NEW.school_id IS DISTINCT FROM OLD.school_id THEN
    PERFORM public.recompute_school_subscription_end(OLD.school_id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_school_subscription_end_from_subscriptions ON subscriptions;
CREATE TRIGGER trg_sync_school_subscription_end_from_subscriptions
AFTER INSERT OR UPDATE OR DELETE ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.sync_school_subscription_end_from_subscriptions();

UPDATE public.schools AS s
SET subscription_end = latest.end_date
FROM (
  SELECT DISTINCT ON (school_id) school_id, end_date
  FROM public.subscriptions
  ORDER BY school_id, created_at DESC, start_date DESC, id DESC
) AS latest
WHERE s.id = latest.school_id;

UPDATE public.schools AS s
SET subscription_end = NULL
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscriptions AS sub
  WHERE sub.school_id = s.id
);

CREATE TABLE IF NOT EXISTS account_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  archive_year INTEGER NOT NULL,
  total_students INTEGER NOT NULL DEFAULT 0,
  total_payments INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, archive_year)
);

CREATE INDEX IF NOT EXISTS idx_account_archives_school_id ON account_archives(school_id);
CREATE INDEX IF NOT EXISTS idx_account_archives_year ON account_archives(archive_year);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  role TEXT NOT NULL DEFAULT 'employee' CHECK (role IN ('super_admin', 'admin', 'manager', 'accountant', 'owner', 'employee')),
  school_id UUID NULL REFERENCES schools(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  custom_permissions TEXT[] NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_school_id ON user_profiles(school_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- جداول المدرسة العامة (إن كانت موجودة مسبقاً نضيف فقط أعمدة المدرسة)
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS classes ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS sections ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS class_fees ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS expense_types ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;

-- جعل الصفوف ورسوم الصفوف فريدة داخل كل مدرسة فقط، وليس على مستوى النظام كله
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'classes'
      AND constraint_name = 'classes_name_key'
  ) THEN
    ALTER TABLE public.classes DROP CONSTRAINT classes_name_key;
  END IF;
END
$$;

-- ============================================================================
-- Dashboard-managed student / teacher accounts
-- ============================================================================

CREATE TABLE IF NOT EXISTS teachers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id UUID NULL REFERENCES branches(id) ON DELETE SET NULL,
  auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  email TEXT NULL,
  phone TEXT NULL,
  specialization TEXT NULL,
  notes TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS specialization TEXT;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE IF EXISTS teachers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE IF EXISTS students ADD COLUMN IF NOT EXISTS auth_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_students_auth_user_id_unique
ON students(auth_user_id)
WHERE auth_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON teachers(school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teachers_auth_user_id_unique
ON teachers(auth_user_id)
WHERE auth_user_id IS NOT NULL;

ALTER TABLE IF EXISTS teachers
  ADD COLUMN IF NOT EXISTS classes_taught JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE TABLE IF NOT EXISTS managed_user_profiles (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('student', 'teacher')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  student_id UUID NULL REFERENCES students(id) ON DELETE SET NULL,
  teacher_id UUID NULL REFERENCES teachers(id) ON DELETE SET NULL,
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
ON managed_user_profiles(school_id);

CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_role_status
ON managed_user_profiles(school_id, role, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_profiles_student_unique
ON managed_user_profiles(student_id)
WHERE student_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_profiles_teacher_unique
ON managed_user_profiles(teacher_id)
WHERE teacher_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_profiles_school_email_unique
ON managed_user_profiles(school_id, lower(email));

CREATE TABLE IF NOT EXISTS subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_subjects_school_name_unique
ON subjects(school_id, name);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES teachers(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  section_id UUID NULL REFERENCES sections(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_assignments_unique_classwide
ON teacher_assignments(school_id, teacher_id, subject_id, class_id)
WHERE section_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_assignments_unique_section
ON teacher_assignments(school_id, teacher_id, subject_id, class_id, section_id)
WHERE section_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS managed_user_credentials (
  auth_user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  login_identifier TEXT NOT NULL,
  temporary_password_hash TEXT,
  has_pending_setup BOOLEAN NOT NULL DEFAULT false,
  password_last_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  card_last_printed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_managed_user_credentials_school_login_unique
ON managed_user_credentials(school_id, login_identifier);

CREATE OR REPLACE FUNCTION public.set_dashboard_managed_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_teachers_updated_at ON teachers;
CREATE TRIGGER trg_teachers_updated_at
BEFORE UPDATE ON teachers
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

DROP TRIGGER IF EXISTS trg_managed_user_profiles_updated_at ON managed_user_profiles;
CREATE TRIGGER trg_managed_user_profiles_updated_at
BEFORE UPDATE ON managed_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_dashboard_managed_updated_at();

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_admin_manage_policy ON teachers;
CREATE POLICY teachers_admin_manage_policy
ON teachers
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

DROP POLICY IF EXISTS managed_user_profiles_admin_manage_policy ON managed_user_profiles;
CREATE POLICY managed_user_profiles_admin_manage_policy
ON managed_user_profiles
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_classes_school_name_unique
ON classes(school_id, name);

CREATE UNIQUE INDEX IF NOT EXISTS idx_class_fees_school_class_name_unique
ON class_fees(school_id, class_name);

CREATE INDEX IF NOT EXISTS idx_classes_school_id ON classes(school_id);
CREATE INDEX IF NOT EXISTS idx_sections_school_id ON sections(school_id);
CREATE INDEX IF NOT EXISTS idx_class_fees_school_id ON class_fees(school_id);
CREATE INDEX IF NOT EXISTS idx_expense_types_school_id ON expense_types(school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);

-- ----------------------------------------------------------------------------
-- Helper functions for RLS
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_school_id()
RETURNS UUID
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT school_id
  FROM public.user_profiles
  WHERE id = auth.uid()
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.current_app_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_school_id() TO authenticated;

-- ----------------------------------------------------------------------------
-- RLS: user_profiles / schools / subscriptions
-- ----------------------------------------------------------------------------

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS user_profiles_select_policy ON user_profiles;
CREATE POLICY user_profiles_select_policy
ON user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid() OR public.current_app_role() = 'super_admin');

DROP POLICY IF EXISTS user_profiles_update_policy ON user_profiles;
CREATE POLICY user_profiles_update_policy
ON user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid() OR public.current_app_role() = 'super_admin')
WITH CHECK (id = auth.uid() OR public.current_app_role() = 'super_admin');

DROP POLICY IF EXISTS user_profiles_insert_policy ON user_profiles;
CREATE POLICY user_profiles_insert_policy
ON user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.current_app_role() = 'super_admin');

DROP POLICY IF EXISTS user_profiles_delete_policy ON user_profiles;
CREATE POLICY user_profiles_delete_policy
ON user_profiles
FOR DELETE
TO authenticated
USING (public.current_app_role() = 'super_admin');

DROP POLICY IF EXISTS schools_select_policy ON schools;
CREATE POLICY schools_select_policy
ON schools
FOR SELECT
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR id = public.current_school_id()
);

DROP POLICY IF EXISTS schools_manage_policy ON schools;
CREATE POLICY schools_manage_policy
ON schools
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');

DROP POLICY IF EXISTS subscriptions_select_policy ON subscriptions;
CREATE POLICY subscriptions_select_policy
ON subscriptions
FOR SELECT
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS subscriptions_manage_policy ON subscriptions;
CREATE POLICY subscriptions_manage_policy
ON subscriptions
FOR ALL
TO authenticated
USING (public.current_app_role() = 'super_admin')
WITH CHECK (public.current_app_role() = 'super_admin');

-- ----------------------------------------------------------------------------
-- RLS tenant policies على جداول المدرسة (إذا الجدول موجود وبه school_id)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  tbl TEXT;
  has_school_id BOOLEAN;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'students',
      'payments',
      'expenses',
      'daily_lectures',
      'branches',
      'weekly_schedule',
      'lesson_times',
      'lecture_prices',
      'deductions',
      'account_archives',
      'expense_types',
      'classes',
      'sections',
      'class_fees',
      'attendance_records'
    ])
  LOOP
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = tbl
        AND column_name = 'school_id'
    ) INTO has_school_id;

    IF has_school_id THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);

      EXECUTE format('DROP POLICY IF EXISTS tenant_select_policy ON public.%I', tbl);
      EXECUTE format($p$
        CREATE POLICY tenant_select_policy
        ON public.%I
        FOR SELECT
        TO authenticated
        USING (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
      $p$, tbl);

      EXECUTE format('DROP POLICY IF EXISTS tenant_insert_policy ON public.%I', tbl);
      EXECUTE format($p$
        CREATE POLICY tenant_insert_policy
        ON public.%I
        FOR INSERT
        TO authenticated
        WITH CHECK (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
      $p$, tbl);

      EXECUTE format('DROP POLICY IF EXISTS tenant_update_policy ON public.%I', tbl);
      EXECUTE format($p$
        CREATE POLICY tenant_update_policy
        ON public.%I
        FOR UPDATE
        TO authenticated
        USING (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
        WITH CHECK (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
      $p$, tbl);

      EXECUTE format('DROP POLICY IF EXISTS tenant_delete_policy ON public.%I', tbl);
      EXECUTE format($p$
        CREATE POLICY tenant_delete_policy
        ON public.%I
        FOR DELETE
        TO authenticated
        USING (
          public.current_app_role() = 'super_admin'
          OR school_id = public.current_school_id()
        )
      $p$, tbl);
    END IF;
  END LOOP;
END
$$;
