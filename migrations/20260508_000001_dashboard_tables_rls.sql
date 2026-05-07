-- Migration: Enable RLS on dashboard tables missing policies
-- Date: 2026-05-08
-- Purpose: class_fees and fee_notifications had no RLS — any authenticated user
--          could read/write records across all schools directly via Supabase client.
-- Uses scope_level matching pattern in 20260507_000001_fix_rls_roles_and_credentials.sql

-- ============================================================
-- 1. CLASS_FEES (school + optional branch scope)
-- ============================================================
ALTER TABLE class_fees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS class_fees_select ON class_fees;
CREATE POLICY class_fees_select ON class_fees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND class_fees.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND class_fees.school_id = up.school_id
               AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
         )
    )
  );

DROP POLICY IF EXISTS class_fees_insert ON class_fees;
CREATE POLICY class_fees_insert ON class_fees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND class_fees.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND class_fees.school_id = up.school_id
               AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
         )
    )
  );

DROP POLICY IF EXISTS class_fees_update ON class_fees;
CREATE POLICY class_fees_update ON class_fees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND class_fees.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND class_fees.school_id = up.school_id
               AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND class_fees.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND class_fees.school_id = up.school_id
               AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
         )
    )
  );

DROP POLICY IF EXISTS class_fees_delete ON class_fees;
CREATE POLICY class_fees_delete ON class_fees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND class_fees.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND class_fees.school_id = up.school_id
               AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
         )
    )
  );

-- ============================================================
-- 2. FEE_NOTIFICATIONS (school + branch scope)
-- ============================================================
ALTER TABLE fee_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fee_notifications_select ON fee_notifications;
CREATE POLICY fee_notifications_select ON fee_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND fee_notifications.school_id = up.school_id
               AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id))
         )
    )
  );

DROP POLICY IF EXISTS fee_notifications_insert ON fee_notifications;
CREATE POLICY fee_notifications_insert ON fee_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND fee_notifications.school_id = up.school_id
               AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id))
         )
    )
  );

DROP POLICY IF EXISTS fee_notifications_update ON fee_notifications;
CREATE POLICY fee_notifications_update ON fee_notifications
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND fee_notifications.school_id = up.school_id
               AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id))
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND fee_notifications.school_id = up.school_id
               AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id))
         )
    )
  );

DROP POLICY IF EXISTS fee_notifications_delete ON fee_notifications;
CREATE POLICY fee_notifications_delete ON fee_notifications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND fee_notifications.school_id = up.school_id
               AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id))
         )
    )
  );
