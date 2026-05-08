-- RLS for fee_notifications and fee_notification_recipients
-- These tables previously had no RLS; access was controlled only via service_role in API routes.
-- Adding RLS provides defense-in-depth against direct DB access.

ALTER TABLE public.fee_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_notification_recipients ENABLE ROW LEVEL SECURITY;

-- fee_notifications: read
DROP POLICY IF EXISTS fee_notifications_select ON public.fee_notifications;
CREATE POLICY fee_notifications_select ON public.fee_notifications
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (
             up.scope_level IN ('branch_user', 'restricted')
             AND fee_notifications.school_id = up.school_id
             AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id)
           )
         )
    )
  );

-- fee_notifications: write (insert/update) — service_role bypasses this; belt-and-suspenders
DROP POLICY IF EXISTS fee_notifications_insert ON public.fee_notifications;
CREATE POLICY fee_notifications_insert ON public.fee_notifications
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notifications.school_id = up.school_id)
           OR (
             up.scope_level IN ('branch_user', 'restricted')
             AND fee_notifications.school_id = up.school_id
             AND (fee_notifications.branch_id IS NULL OR fee_notifications.branch_id = up.branch_id)
           )
         )
    )
  );

-- fee_notification_recipients: read
DROP POLICY IF EXISTS fee_notification_recipients_select ON public.fee_notification_recipients;
CREATE POLICY fee_notification_recipients_select ON public.fee_notification_recipients
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notification_recipients.school_id = up.school_id)
           OR (
             up.scope_level IN ('branch_user', 'restricted')
             AND fee_notification_recipients.school_id = up.school_id
             AND (fee_notification_recipients.branch_id IS NULL OR fee_notification_recipients.branch_id = up.branch_id)
           )
         )
    )
  );

-- fee_notification_recipients: write
DROP POLICY IF EXISTS fee_notification_recipients_insert ON public.fee_notification_recipients;
CREATE POLICY fee_notification_recipients_insert ON public.fee_notification_recipients
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = auth.uid()
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND fee_notification_recipients.school_id = up.school_id)
           OR (
             up.scope_level IN ('branch_user', 'restricted')
             AND fee_notification_recipients.school_id = up.school_id
             AND (fee_notification_recipients.branch_id IS NULL OR fee_notification_recipients.branch_id = up.branch_id)
           )
         )
    )
  );
