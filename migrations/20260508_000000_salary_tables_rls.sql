-- Migration: Enable RLS on salary-related tables
-- Date: 2026-05-08
-- Purpose: deductions, daily_lectures, salary_archives, lecture_prices were missing RLS.
-- Also adds admin INSERT/UPDATE/DELETE policies to teachers table.
-- Uses scope_level (not role) matching the pattern in 20260507_000001_fix_rls_roles_and_credentials.sql

-- ============================================================
-- 1. DEDUCTIONS
-- ============================================================
ALTER TABLE deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deductions_select ON deductions;
CREATE POLICY deductions_select ON deductions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND deductions.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND deductions.school_id = up.school_id AND deductions.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS deductions_insert ON deductions;
CREATE POLICY deductions_insert ON deductions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND deductions.school_id = up.school_id)
           OR (up.scope_level = 'branch_user'  AND deductions.school_id = up.school_id AND deductions.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS deductions_update ON deductions;
CREATE POLICY deductions_update ON deductions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND deductions.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND deductions.school_id = up.school_id AND deductions.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND deductions.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND deductions.school_id = up.school_id AND deductions.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS deductions_delete ON deductions;
CREATE POLICY deductions_delete ON deductions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND deductions.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND deductions.school_id = up.school_id AND deductions.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- 2. DAILY_LECTURES
-- ============================================================
ALTER TABLE daily_lectures ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_lectures_select ON daily_lectures;
CREATE POLICY daily_lectures_select ON daily_lectures
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND daily_lectures.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND daily_lectures.school_id = up.school_id AND daily_lectures.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS daily_lectures_insert ON daily_lectures;
CREATE POLICY daily_lectures_insert ON daily_lectures
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND daily_lectures.school_id = up.school_id)
           OR (up.scope_level = 'branch_user'  AND daily_lectures.school_id = up.school_id AND daily_lectures.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS daily_lectures_update ON daily_lectures;
CREATE POLICY daily_lectures_update ON daily_lectures
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND daily_lectures.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND daily_lectures.school_id = up.school_id AND daily_lectures.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND daily_lectures.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND daily_lectures.school_id = up.school_id AND daily_lectures.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS daily_lectures_delete ON daily_lectures;
CREATE POLICY daily_lectures_delete ON daily_lectures
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND daily_lectures.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND daily_lectures.school_id = up.school_id AND daily_lectures.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- 3. SALARY_ARCHIVES (school-level only, no branch_id column)
-- ============================================================
ALTER TABLE salary_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS salary_archives_select ON salary_archives;
CREATE POLICY salary_archives_select ON salary_archives
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted') AND salary_archives.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS salary_archives_insert ON salary_archives;
CREATE POLICY salary_archives_insert ON salary_archives
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND salary_archives.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS salary_archives_update ON salary_archives;
CREATE POLICY salary_archives_update ON salary_archives
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND salary_archives.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND salary_archives.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS salary_archives_delete ON salary_archives;
CREATE POLICY salary_archives_delete ON salary_archives
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND salary_archives.school_id = up.school_id)
         )
    )
  );

-- ============================================================
-- 4. LECTURE_PRICES (school-level only, no branch_id)
-- ============================================================
ALTER TABLE lecture_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lecture_prices_select ON lecture_prices;
CREATE POLICY lecture_prices_select ON lecture_prices
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted') AND lecture_prices.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS lecture_prices_insert ON lecture_prices;
CREATE POLICY lecture_prices_insert ON lecture_prices
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lecture_prices.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS lecture_prices_update ON lecture_prices;
CREATE POLICY lecture_prices_update ON lecture_prices
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lecture_prices.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lecture_prices.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS lecture_prices_delete ON lecture_prices;
CREATE POLICY lecture_prices_delete ON lecture_prices
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lecture_prices.school_id = up.school_id)
         )
    )
  );

-- ============================================================
-- 5. TEACHERS — add admin INSERT/UPDATE/DELETE (self-select policy already exists)
-- ============================================================
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS teachers_select ON teachers;
CREATE POLICY teachers_select ON teachers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND teachers.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND teachers.school_id = up.school_id AND teachers.branch_id = up.branch_id)
           -- Teacher can see their own record
           OR teachers.user_id = auth.uid()
         )
    )
  );

DROP POLICY IF EXISTS teachers_insert ON teachers;
CREATE POLICY teachers_insert ON teachers
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND teachers.school_id = up.school_id)
           OR (up.scope_level = 'branch_user'  AND teachers.school_id = up.school_id AND teachers.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS teachers_update ON teachers;
CREATE POLICY teachers_update ON teachers
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teachers.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teachers.school_id = up.school_id AND teachers.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teachers.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teachers.school_id = up.school_id AND teachers.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS teachers_delete ON teachers;
CREATE POLICY teachers_delete ON teachers
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teachers.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teachers.school_id = up.school_id AND teachers.branch_id = up.branch_id)
         )
    )
  );
