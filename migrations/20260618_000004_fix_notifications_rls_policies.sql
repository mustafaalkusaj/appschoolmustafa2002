-- CRITICAL FIX: school_notifications and school_announcements had RLS enabled
-- but zero policies defined — resulting in deny-all for authenticated role.
-- Add proper school-scoped policies. Admins can create; own-school users can read.

BEGIN;

-- ============================================================
-- school_notifications
-- ============================================================
CREATE POLICY school_notifications_select ON public.school_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted')
               AND school_notifications.school_id = up.school_id)
         )
    )
  );

CREATE POLICY school_notifications_insert ON public.school_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user')
               AND school_notifications.school_id = up.school_id)
         )
    )
  );

CREATE POLICY school_notifications_update ON public.school_notifications
  FOR UPDATE TO authenticated
  USING (
    -- Only the sender or admins can update a notification
    sent_by_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND school_notifications.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    sent_by_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND school_notifications.school_id = up.school_id)
         )
    )
  );

CREATE POLICY school_notifications_delete ON public.school_notifications
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND school_notifications.school_id = up.school_id)
         )
    )
  );

-- ============================================================
-- school_announcements
-- ============================================================
CREATE POLICY school_announcements_select ON public.school_announcements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user', 'restricted')
               AND school_announcements.school_id = up.school_id)
         )
    )
  );

CREATE POLICY school_announcements_insert ON public.school_announcements
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level IN ('group_admin', 'branch_user')
               AND school_announcements.school_id = up.school_id)
         )
    )
  );

CREATE POLICY school_announcements_update ON public.school_announcements
  FOR UPDATE TO authenticated
  USING (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND school_announcements.school_id = up.school_id)
         )
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND school_announcements.school_id = up.school_id)
         )
    )
  );

CREATE POLICY school_announcements_delete ON public.school_announcements
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND school_announcements.school_id = up.school_id)
         )
    )
  );

-- Fix user_push_subscriptions: enforce school_id belongs to user's own school on INSERT
-- (Current policy allows registering push tokens for any school_id)
DROP POLICY IF EXISTS "Users manage own push subscriptions" ON public.user_push_subscriptions;

CREATE POLICY push_subscriptions_select ON public.user_push_subscriptions
  FOR SELECT TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY push_subscriptions_insert ON public.user_push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = (SELECT auth.uid())
    AND school_id IN (
      SELECT school_id FROM user_profiles WHERE id = (SELECT auth.uid())
    )
  );

CREATE POLICY push_subscriptions_update ON public.user_push_subscriptions
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY push_subscriptions_delete ON public.user_push_subscriptions
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

COMMIT;
