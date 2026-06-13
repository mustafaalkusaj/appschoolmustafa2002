-- Migration: Fix expense_types RLS policy
-- Date: 2026-05-09
-- Problem: Existing policy uses get_current_user_school_id() which returns NULL
--          for super_admin users (no school_id in user_profiles), blocking them
--          from all expense_types access.
-- Fix: Replace with EXISTS pattern matching other salary/expense tables.

DROP POLICY IF EXISTS expense_types_school_isolation ON expense_types;

CREATE POLICY expense_types_select ON expense_types
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted') AND expense_types.school_id = up.school_id)
         )
    )
  );

CREATE POLICY expense_types_insert ON expense_types
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND expense_types.school_id = up.school_id)
         )
    )
  );

CREATE POLICY expense_types_update ON expense_types
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND expense_types.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND expense_types.school_id = up.school_id)
         )
    )
  );

CREATE POLICY expense_types_delete ON expense_types
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user') AND expense_types.school_id = up.school_id)
         )
    )
  );
