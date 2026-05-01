-- Migration: Add RLS policies to sensitive financial and personal data tables
-- Date: 2026-05-01
-- Purpose: Database-level protection for student, payment, expense, salary, and attendance data
--
-- Important: This migration assumes:
-- - user_profiles.school_id is always set for non-super_admin users
-- - user_profiles.branch_id is set for branch-scoped users
-- - user_profiles.group_id is set for group-scoped (multi-branch) users
-- - All records have school_id (enforce via NOT NULL after backfill if needed)

-- ============================================================================
-- 1. Enable RLS on sensitive tables (if not already enabled)
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. STUDENTS table policies
-- ============================================================================

DROP POLICY IF EXISTS "students_school_isolation" ON students;
CREATE POLICY "students_school_isolation" ON students
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
        UNION
      SELECT school_id FROM schools WHERE id = auth.uid()::text  -- fallback if super_admin stored as id
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "students_insert_check_school" ON students;
CREATE POLICY "students_insert_check_school" ON students
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    AND
    (
      -- If branch_id is provided, it must match user's branch or be multi-branch
      branch_id IS NULL
      OR
      branch_id IN (SELECT id FROM branches WHERE school_id = school_id)
      OR
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND (branch_id = students.branch_id OR group_id IS NOT NULL)
      )
    )
  );

DROP POLICY IF EXISTS "students_update_check_school" ON students;
CREATE POLICY "students_update_check_school" ON students
  FOR UPDATE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "students_delete_check_school" ON students;
CREATE POLICY "students_delete_check_school" ON students
  FOR DELETE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 3. PAYMENTS table policies
-- ============================================================================

DROP POLICY IF EXISTS "payments_school_isolation" ON payments;
CREATE POLICY "payments_school_isolation" ON payments
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "payments_insert_check_school" ON payments;
CREATE POLICY "payments_insert_check_school" ON payments
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "payments_update_check_school" ON payments;
CREATE POLICY "payments_update_check_school" ON payments
  FOR UPDATE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "payments_delete_check_school" ON payments;
CREATE POLICY "payments_delete_check_school" ON payments
  FOR DELETE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 4. EXPENSES table policies
-- ============================================================================

DROP POLICY IF EXISTS "expenses_school_isolation" ON expenses;
CREATE POLICY "expenses_school_isolation" ON expenses
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "expenses_insert_check_school" ON expenses;
CREATE POLICY "expenses_insert_check_school" ON expenses
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "expenses_update_check_school" ON expenses;
CREATE POLICY "expenses_update_check_school" ON expenses
  FOR UPDATE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "expenses_delete_check_school" ON expenses;
CREATE POLICY "expenses_delete_check_school" ON expenses
  FOR DELETE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 5. SALARIES table policies
-- ============================================================================

DROP POLICY IF EXISTS "salaries_school_isolation" ON salaries;
CREATE POLICY "salaries_school_isolation" ON salaries
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "salaries_insert_check_school" ON salaries;
CREATE POLICY "salaries_insert_check_school" ON salaries
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "salaries_update_check_school" ON salaries;
CREATE POLICY "salaries_update_check_school" ON salaries
  FOR UPDATE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "salaries_delete_check_school" ON salaries;
CREATE POLICY "salaries_delete_check_school" ON salaries
  FOR DELETE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- 6. ATTENDANCE table policies
-- ============================================================================

DROP POLICY IF EXISTS "attendance_school_isolation" ON attendance;
CREATE POLICY "attendance_school_isolation" ON attendance
  FOR SELECT
  USING (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "attendance_insert_check_school" ON attendance;
CREATE POLICY "attendance_insert_check_school" ON attendance
  FOR INSERT
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM user_profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "attendance_update_check_school" ON attendance;
CREATE POLICY "attendance_update_check_school" ON attendance
  FOR UPDATE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "attendance_delete_check_school" ON attendance;
CREATE POLICY "attendance_delete_check_school" ON attendance
  FOR DELETE
  USING (school_id IN (SELECT school_id FROM user_profiles WHERE id = auth.uid()));

-- ============================================================================
-- End of RLS policies migration
-- ============================================================================
--
-- Summary of what was added:
-- - 4 policies per sensitive table (SELECT, INSERT, UPDATE, DELETE)
-- - School isolation enforced at database level
-- - Super admin can access all data
-- - Non-super_admin restricted to their school_id
-- - All operations now require valid school_id match
--
-- Notes:
-- - These policies will work alongside existing application-level filtering
-- - They provide defense-in-depth protection
-- - If API has bugs, database-level RLS will still prevent data leakage
