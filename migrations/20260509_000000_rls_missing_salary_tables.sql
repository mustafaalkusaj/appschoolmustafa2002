-- Migration: Add RLS to salaries, weekly_schedule, and lesson_times
-- Date: 2026-05-09
-- Reason: These tables were missing RLS while other salary tables were protected.
-- Pattern mirrors 20260508_000000_salary_tables_rls.sql

-- ============================================================
-- 1. SALARIES (branch-level)
-- ============================================================
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS salaries_select ON salaries;
CREATE POLICY salaries_select ON salaries
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND salaries.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS salaries_insert ON salaries;
CREATE POLICY salaries_insert ON salaries
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND salaries.school_id = up.school_id)
           OR (up.scope_level = 'branch_user'  AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS salaries_update ON salaries;
CREATE POLICY salaries_update ON salaries
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND salaries.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND salaries.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS salaries_delete ON salaries;
CREATE POLICY salaries_delete ON salaries
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND salaries.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- 2. WEEKLY_SCHEDULE (school-level only — no branch_id column)
-- ============================================================
ALTER TABLE weekly_schedule ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS weekly_schedule_select ON weekly_schedule;
CREATE POLICY weekly_schedule_select ON weekly_schedule
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted') AND weekly_schedule.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS weekly_schedule_insert ON weekly_schedule;
CREATE POLICY weekly_schedule_insert ON weekly_schedule
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND weekly_schedule.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS weekly_schedule_update ON weekly_schedule;
CREATE POLICY weekly_schedule_update ON weekly_schedule
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND weekly_schedule.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND weekly_schedule.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS weekly_schedule_delete ON weekly_schedule;
CREATE POLICY weekly_schedule_delete ON weekly_schedule
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND weekly_schedule.school_id = up.school_id)
         )
    )
  );

-- ============================================================
-- 3. LESSON_TIMES (school-level, no branch_id column)
-- ============================================================
ALTER TABLE lesson_times ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lesson_times_select ON lesson_times;
CREATE POLICY lesson_times_select ON lesson_times
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted') AND lesson_times.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS lesson_times_insert ON lesson_times;
CREATE POLICY lesson_times_insert ON lesson_times
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lesson_times.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS lesson_times_update ON lesson_times;
CREATE POLICY lesson_times_update ON lesson_times
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lesson_times.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lesson_times.school_id = up.school_id)
         )
    )
  );

DROP POLICY IF EXISTS lesson_times_delete ON lesson_times;
CREATE POLICY lesson_times_delete ON lesson_times
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND lesson_times.school_id = up.school_id)
         )
    )
  );
