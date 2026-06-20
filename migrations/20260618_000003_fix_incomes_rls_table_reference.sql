-- CRITICAL FIX: incomes and income_types RLS used `users` table instead of `user_profiles`
-- The `users` table has no school_id column — all policies evaluated to false (deny-all)
-- or raised runtime errors. Replace with correct user_profiles reference + scope_level pattern.

BEGIN;

-- ============================================================
-- income_types
-- ============================================================
DROP POLICY IF EXISTS income_types_select ON income_types;
DROP POLICY IF EXISTS income_types_insert ON income_types;
DROP POLICY IF EXISTS income_types_update ON income_types;
DROP POLICY IF EXISTS income_types_delete ON income_types;

CREATE POLICY income_types_select ON income_types
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND income_types.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND income_types.school_id = up.school_id
               AND (income_types.branch_id IS NULL OR income_types.branch_id = up.branch_id))
         )
    )
  );

CREATE POLICY income_types_insert ON income_types
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND income_types.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND income_types.school_id = up.school_id
               AND (income_types.branch_id IS NULL OR income_types.branch_id = up.branch_id))
         )
    )
  );

CREATE POLICY income_types_update ON income_types
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND income_types.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND income_types.school_id = up.school_id
               AND (income_types.branch_id IS NULL OR income_types.branch_id = up.branch_id))
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND income_types.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND income_types.school_id = up.school_id
               AND (income_types.branch_id IS NULL OR income_types.branch_id = up.branch_id))
         )
    )
  );

CREATE POLICY income_types_delete ON income_types
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND income_types.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND income_types.school_id = up.school_id
               AND (income_types.branch_id IS NULL OR income_types.branch_id = up.branch_id))
         )
    )
  );

-- ============================================================
-- incomes
-- ============================================================
DROP POLICY IF EXISTS incomes_select ON incomes;
DROP POLICY IF EXISTS incomes_insert ON incomes;
DROP POLICY IF EXISTS incomes_update ON incomes;
DROP POLICY IF EXISTS incomes_delete ON incomes;

CREATE POLICY incomes_select ON incomes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND incomes.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND incomes.school_id = up.school_id
               AND (incomes.branch_id IS NULL OR incomes.branch_id = up.branch_id))
         )
    )
  );

CREATE POLICY incomes_insert ON incomes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND incomes.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND incomes.school_id = up.school_id
               AND (incomes.branch_id IS NULL OR incomes.branch_id = up.branch_id))
         )
    )
  );

CREATE POLICY incomes_update ON incomes
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND incomes.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND incomes.school_id = up.school_id
               AND (incomes.branch_id IS NULL OR incomes.branch_id = up.branch_id))
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND incomes.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND incomes.school_id = up.school_id
               AND (incomes.branch_id IS NULL OR incomes.branch_id = up.branch_id))
         )
    )
  );

CREATE POLICY incomes_delete ON incomes
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND incomes.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND incomes.school_id = up.school_id
               AND (incomes.branch_id IS NULL OR incomes.branch_id = up.branch_id))
         )
    )
  );

COMMIT;
