-- C-4: Fix RLS policies to use scope_level instead of non-existent role values
-- C-5: Drop broad tenant_select_policy from tables that have fine-grained RLS
-- C-7: Enable RLS on managed_user_credentials table

-- ============================================================
-- C-4: Fix role references in fine-grained RLS policies
-- The 20260501_fix_rls_policies.sql used role = 'group_admin' / 'branch_admin'
-- but user_profiles.role CHECK only allows:
--   super_admin, admin, manager, accountant, owner, employee
-- The correct column is scope_level which has:
--   super_admin, group_admin, branch_user, restricted
-- ============================================================

-- Rebuild all 20 fine-grained policies using scope_level instead of role.
-- Tables: students, payments, expenses, salaries, attendance

-- ---- STUDENTS ----

DROP POLICY IF EXISTS students_select ON students;
CREATE POLICY students_select ON students
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND students.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS students_insert ON students;
CREATE POLICY students_insert ON students
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND students.school_id = up.school_id
               AND EXISTS (SELECT 1 FROM branches b WHERE b.id = students.branch_id AND b.school_id = up.school_id))
           OR (up.scope_level = 'branch_user'  AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS students_update ON students;
CREATE POLICY students_update ON students
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND students.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND students.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS students_delete ON students;
CREATE POLICY students_delete ON students
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND students.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND students.school_id = up.school_id AND students.branch_id = up.branch_id)
         )
    )
  );

-- ---- PAYMENTS ----

DROP POLICY IF EXISTS payments_select ON payments;
CREATE POLICY payments_select ON payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND payments.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS payments_insert ON payments;
CREATE POLICY payments_insert ON payments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND payments.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS payments_update ON payments;
CREATE POLICY payments_update ON payments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND payments.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND payments.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS payments_delete ON payments;
CREATE POLICY payments_delete ON payments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND payments.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND payments.school_id = up.school_id AND payments.branch_id = up.branch_id)
         )
    )
  );

-- ---- EXPENSES ----

DROP POLICY IF EXISTS expenses_select ON expenses;
CREATE POLICY expenses_select ON expenses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND expenses.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS expenses_insert ON expenses;
CREATE POLICY expenses_insert ON expenses
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND expenses.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS expenses_update ON expenses;
CREATE POLICY expenses_update ON expenses
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND expenses.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND expenses.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS expenses_delete ON expenses;
CREATE POLICY expenses_delete ON expenses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND expenses.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND expenses.school_id = up.school_id AND expenses.branch_id = up.branch_id)
         )
    )
  );

-- ---- SALARIES ----

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
           OR (up.scope_level = 'group_admin' AND salaries.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND salaries.school_id = up.school_id AND salaries.branch_id = up.branch_id)
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

-- ---- ATTENDANCE ----

DROP POLICY IF EXISTS attendance_select ON attendance;
CREATE POLICY attendance_select ON attendance
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin'  AND attendance.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS attendance_insert ON attendance;
CREATE POLICY attendance_insert ON attendance
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND attendance.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS attendance_update ON attendance;
CREATE POLICY attendance_update ON attendance
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND attendance.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND attendance.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
         )
    )
  );

DROP POLICY IF EXISTS attendance_delete ON attendance;
CREATE POLICY attendance_delete ON attendance
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND attendance.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND attendance.school_id = up.school_id AND attendance.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- C-5: Drop broad tenant_select_policy from tables that now have
-- fine-grained scope-level policies. These permissive school-only
-- policies OR-ed with branch-scoped policies defeat branch isolation.
-- ============================================================

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'students', 'payments', 'expenses', 'salaries', 'attendance'
  ]) LOOP
    EXECUTE format('DROP POLICY IF EXISTS tenant_select_policy ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert_policy ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update_policy ON public.%I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete_policy ON public.%I', tbl);
  END LOOP;
END;
$$;

-- ============================================================
-- C-7: Enable RLS on managed_user_credentials
-- Previously had no RLS — password hashes accessible to any auth user
-- ============================================================

ALTER TABLE managed_user_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE managed_user_credentials FORCE ROW LEVEL SECURITY;

-- Only super_admin can read all credentials
-- Regular users can only read their own credential row
DROP POLICY IF EXISTS managed_user_credentials_select ON managed_user_credentials;
CREATE POLICY managed_user_credentials_select ON managed_user_credentials
  FOR SELECT TO authenticated
  USING (
    public.current_app_role() = 'super_admin'
    OR user_id = auth.uid()
  );

-- Only super_admin and school admins can insert/update credentials
DROP POLICY IF EXISTS managed_user_credentials_insert ON managed_user_credentials;
CREATE POLICY managed_user_credentials_insert ON managed_user_credentials
  FOR INSERT TO authenticated
  WITH CHECK (
    public.current_app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND up.scope_level IN ('super_admin', 'group_admin')
    )
  );

DROP POLICY IF EXISTS managed_user_credentials_update ON managed_user_credentials;
CREATE POLICY managed_user_credentials_update ON managed_user_credentials
  FOR UPDATE TO authenticated
  USING (
    public.current_app_role() = 'super_admin'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND up.scope_level IN ('super_admin', 'group_admin')
    )
  )
  WITH CHECK (
    public.current_app_role() = 'super_admin'
    OR user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND up.scope_level IN ('super_admin', 'group_admin')
    )
  );

DROP POLICY IF EXISTS managed_user_credentials_delete ON managed_user_credentials;
CREATE POLICY managed_user_credentials_delete ON managed_user_credentials
  FOR DELETE TO authenticated
  USING (
    public.current_app_role() = 'super_admin'
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND up.scope_level = 'super_admin'
    )
  );
