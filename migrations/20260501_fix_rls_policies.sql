-- Fix RLS Policies: Drop old, create correct 20 policies (4 per table)
-- Tables: students, payments, expenses, salaries, attendance

-- ============================================================================
-- STEP 1: Drop ALL existing policies on the 5 tables
-- ============================================================================

DROP POLICY IF EXISTS "students_school_isolation" ON students;
DROP POLICY IF EXISTS "school_isolation_students" ON students;
DROP POLICY IF EXISTS "students_insert_check_school" ON students;
DROP POLICY IF EXISTS "students_update_check_school" ON students;
DROP POLICY IF EXISTS "students_delete_check_school" ON students;

DROP POLICY IF EXISTS "payments_school_isolation" ON payments;
DROP POLICY IF EXISTS "school_isolation_payments" ON payments;
DROP POLICY IF EXISTS "payments_insert_check_school" ON payments;
DROP POLICY IF EXISTS "payments_update_check_school" ON payments;
DROP POLICY IF EXISTS "payments_delete_check_school" ON payments;

DROP POLICY IF EXISTS "expenses_school_isolation" ON expenses;
DROP POLICY IF EXISTS "expenses_insert_check_school" ON expenses;
DROP POLICY IF EXISTS "expenses_update_check_school" ON expenses;
DROP POLICY IF EXISTS "expenses_delete_check_school" ON expenses;

DROP POLICY IF EXISTS "salaries_school_isolation" ON salaries;
DROP POLICY IF EXISTS "salaries_insert_check_school" ON salaries;
DROP POLICY IF EXISTS "salaries_update_check_school" ON salaries;
DROP POLICY IF EXISTS "salaries_delete_check_school" ON salaries;

DROP POLICY IF EXISTS "attendance_school_isolation" ON attendance;
DROP POLICY IF EXISTS "attendance_insert_check_school" ON attendance;
DROP POLICY IF EXISTS "attendance_update_check_school" ON attendance;
DROP POLICY IF EXISTS "attendance_delete_check_school" ON attendance;

-- ============================================================================
-- STEP 2: Verify RLS enabled on all 5 tables
-- ============================================================================

ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE salaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 3: Create 20 new policies (4 per table)
-- ============================================================================

-- ============================================================================
-- STUDENTS - 4 policies
-- ============================================================================

CREATE POLICY "students_select" ON students
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND students.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "students_insert" ON students
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
            AND (students.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = students.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (up.role = 'branch_admin' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "students_update" ON students
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND students.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (
            up.role = 'group_admin'
            AND students.school_id = up.school_id
            AND (students.branch_id IS NULL OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = students.branch_id AND b.school_id = up.school_id
            ))
          )
          OR (up.role = 'branch_admin' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "students_delete" ON students
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND students.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
        )
    )
  );

-- ============================================================================
-- PAYMENTS - 4 policies
-- ============================================================================

CREATE POLICY "payments_select" ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND payments.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "payments_insert" ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "payments_update" ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND payments.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "payments_delete" ON payments
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND payments.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
        )
    )
  );

-- ============================================================================
-- EXPENSES - 4 policies
-- ============================================================================

CREATE POLICY "expenses_select" ON expenses
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND expenses.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "expenses_insert" ON expenses
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "expenses_update" ON expenses
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND expenses.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "expenses_delete" ON expenses
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND expenses.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
        )
    )
  );

-- ============================================================================
-- SALARIES - 4 policies
-- ============================================================================

CREATE POLICY "salaries_select" ON salaries
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND salaries.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "salaries_insert" ON salaries
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "salaries_update" ON salaries
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND salaries.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "salaries_delete" ON salaries
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND salaries.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
        )
    )
  );

-- ============================================================================
-- ATTENDANCE - 4 policies
-- ============================================================================

CREATE POLICY "attendance_select" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND attendance.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "attendance_insert" ON attendance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "attendance_update" ON attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND attendance.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
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
          OR (up.role = 'branch_admin' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
        )
    )
  );

CREATE POLICY "attendance_delete" ON attendance
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'group_admin' AND attendance.school_id = up.school_id)
          OR (up.role = 'branch_admin' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
        )
    )
  );

-- ============================================================================
-- VERIFICATION
-- ============================================================================
-- After this migration runs, verify with:
--
-- SELECT tablename, COUNT(*) as policy_count
-- FROM pg_policies
-- WHERE schemaname = 'public'
--   AND tablename IN ('students', 'payments', 'expenses', 'salaries', 'attendance')
-- GROUP BY tablename
-- ORDER BY tablename;
--
-- Expected: 4 policies per table = 20 total
-- cmd should be: SELECT / INSERT / UPDATE / DELETE
-- UPDATE/INSERT should have with_check NOT NULL
