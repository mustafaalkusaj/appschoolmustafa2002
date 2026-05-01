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
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND students.school_id = up.school_id
            AND students.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "students_insert_check_school" ON students;
CREATE POLICY "students_insert_check_school" ON students
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
            AND (
              students.branch_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM public.branches b
                WHERE b.id = students.branch_id
                  AND b.school_id = up.school_id
              )
            )
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND students.school_id = up.school_id
            AND students.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "students_update_check_school" ON students;
CREATE POLICY "students_update_check_school" ON students
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND students.school_id = up.school_id
            AND students.branch_id = up.branch_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: cannot change school_id
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
            AND (
              students.branch_id IS NULL
              OR EXISTS (
                SELECT 1
                FROM public.branches b
                WHERE b.id = students.branch_id
                  AND b.school_id = up.school_id
              )
            )
          )

          -- Branch admin: cannot change school_id or branch_id
          OR (
            up.role = 'branch_admin'
            AND students.school_id = up.school_id
            AND students.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "students_delete_check_school" ON students;
CREATE POLICY "students_delete_check_school" ON students
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND students.school_id = up.school_id
            AND students.branch_id = up.branch_id
          )
        )
    )
  );

-- ============================================================================
-- 3. PAYMENTS table policies
-- ============================================================================

DROP POLICY IF EXISTS "payments_school_isolation" ON payments;
CREATE POLICY "payments_school_isolation" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND payments.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND payments.school_id = up.school_id
            AND payments.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "payments_insert_check_school" ON payments;
CREATE POLICY "payments_insert_check_school" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND payments.school_id = up.school_id
            AND (payments.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = payments.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND payments.school_id = up.school_id
            AND payments.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "payments_update_check_school" ON payments;
CREATE POLICY "payments_update_check_school" ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND payments.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND payments.school_id = up.school_id
            AND payments.branch_id = up.branch_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND payments.school_id = up.school_id
            AND (payments.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = payments.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND payments.school_id = up.school_id
            AND payments.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "payments_delete_check_school" ON payments;
CREATE POLICY "payments_delete_check_school" ON payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND payments.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND payments.school_id = up.school_id
            AND payments.branch_id = up.branch_id
          )
        )
    )
  );

-- ============================================================================
-- 4. EXPENSES table policies
-- ============================================================================

DROP POLICY IF EXISTS "expenses_school_isolation" ON expenses;
CREATE POLICY "expenses_school_isolation" ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND expenses.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND expenses.school_id = up.school_id
            AND expenses.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "expenses_insert_check_school" ON expenses;
CREATE POLICY "expenses_insert_check_school" ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND expenses.school_id = up.school_id
            AND (expenses.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = expenses.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND expenses.school_id = up.school_id
            AND expenses.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "expenses_update_check_school" ON expenses;
CREATE POLICY "expenses_update_check_school" ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND expenses.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND expenses.school_id = up.school_id
            AND expenses.branch_id = up.branch_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND expenses.school_id = up.school_id
            AND (expenses.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = expenses.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND expenses.school_id = up.school_id
            AND expenses.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "expenses_delete_check_school" ON expenses;
CREATE POLICY "expenses_delete_check_school" ON expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND expenses.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND expenses.school_id = up.school_id
            AND expenses.branch_id = up.branch_id
          )
        )
    )
  );

-- ============================================================================
-- 5. SALARIES table policies
-- ============================================================================

DROP POLICY IF EXISTS "salaries_school_isolation" ON salaries;
CREATE POLICY "salaries_school_isolation" ON salaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND salaries.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND salaries.school_id = up.school_id
            AND salaries.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "salaries_insert_check_school" ON salaries;
CREATE POLICY "salaries_insert_check_school" ON salaries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND salaries.school_id = up.school_id
            AND (salaries.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = salaries.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND salaries.school_id = up.school_id
            AND salaries.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "salaries_update_check_school" ON salaries;
CREATE POLICY "salaries_update_check_school" ON salaries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND salaries.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND salaries.school_id = up.school_id
            AND salaries.branch_id = up.branch_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND salaries.school_id = up.school_id
            AND (salaries.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = salaries.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND salaries.school_id = up.school_id
            AND salaries.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "salaries_delete_check_school" ON salaries;
CREATE POLICY "salaries_delete_check_school" ON salaries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND salaries.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND salaries.school_id = up.school_id
            AND salaries.branch_id = up.branch_id
          )
        )
    )
  );

-- ============================================================================
-- 6. ATTENDANCE table policies
-- ============================================================================

DROP POLICY IF EXISTS "attendance_school_isolation" ON attendance;
CREATE POLICY "attendance_school_isolation" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          -- Super admin: full access
          up.role = 'super_admin'

          -- Group admin: access to own school, any branch within school
          OR (
            up.role = 'group_admin'
            AND attendance.school_id = up.school_id
          )

          -- Branch admin: access to own school and own branch only
          OR (
            up.role = 'branch_admin'
            AND attendance.school_id = up.school_id
            AND attendance.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "attendance_insert_check_school" ON attendance;
CREATE POLICY "attendance_insert_check_school" ON attendance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND attendance.school_id = up.school_id
            AND (attendance.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = attendance.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND attendance.school_id = up.school_id
            AND attendance.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "attendance_update_check_school" ON attendance;
CREATE POLICY "attendance_update_check_school" ON attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND attendance.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND attendance.school_id = up.school_id
            AND attendance.branch_id = up.branch_id
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND attendance.school_id = up.school_id
            AND (attendance.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = attendance.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (
            up.role = 'branch_admin'
            AND attendance.school_id = up.school_id
            AND attendance.branch_id = up.branch_id
          )
        )
    )
  );

DROP POLICY IF EXISTS "attendance_delete_check_school" ON attendance;
CREATE POLICY "attendance_delete_check_school" ON attendance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND attendance.school_id = up.school_id
          )
          OR (
            up.role = 'branch_admin'
            AND attendance.school_id = up.school_id
            AND attendance.branch_id = up.branch_id
          )
        )
    )
  );

-- ============================================================================
-- End of RLS policies migration
-- ============================================================================
--
-- Summary of what was added:
-- - 4 policies per sensitive table (SELECT, INSERT, UPDATE, DELETE)
-- - School isolation enforced at database level
-- - Branch isolation enforced at database level
-- - Super admin can access all data
-- - Group admin limited to school_id + any branch within school
-- - Branch admin limited to school_id + specific branch_id
-- - All UPDATE policies include WITH CHECK to prevent privilege escalation
--
-- Notes:
-- - These policies work alongside existing application-level filtering
-- - They provide defense-in-depth protection
-- - If API has bugs, database-level RLS will still prevent data leakage
-- - Branch_admin cannot elevate to school-wide access
