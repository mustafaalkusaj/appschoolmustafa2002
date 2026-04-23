-- Enable RLS on tables that were created without it.
-- Without these policies any authenticated user could read data from all schools/branches.

ALTER TABLE public.fee_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_notification_recipients ENABLE ROW LEVEL SECURITY;

-- fee_notifications: admins/employees of the same school can SELECT
CREATE POLICY "fee_notifications_school_select"
  ON public.fee_notifications
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notifications.school_id
    )
  );

-- fee_notifications: only admin/super_admin can INSERT
CREATE POLICY "fee_notifications_school_insert"
  ON public.fee_notifications
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notifications.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- fee_notifications: only admin/super_admin of same school can UPDATE
CREATE POLICY "fee_notifications_school_update"
  ON public.fee_notifications
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notifications.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- fee_notifications: only super_admin can DELETE
CREATE POLICY "fee_notifications_school_delete"
  ON public.fee_notifications
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notifications.school_id
        AND up.role = 'super_admin'
    )
  );

-- fee_notification_recipients: same school members can SELECT
CREATE POLICY "fee_notification_recipients_school_select"
  ON public.fee_notification_recipients
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notification_recipients.school_id
    )
  );

-- fee_notification_recipients: only admin/super_admin of same school can INSERT
CREATE POLICY "fee_notification_recipients_school_insert"
  ON public.fee_notification_recipients
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notification_recipients.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- fee_notification_recipients: only super_admin can DELETE
CREATE POLICY "fee_notification_recipients_school_delete"
  ON public.fee_notification_recipients
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = fee_notification_recipients.school_id
        AND up.role = 'super_admin'
    )
  );

-- ─── admin_branch_scopes ────────────────────────────────────────────────────
-- Stores which branches each admin can access — must be school-isolated.

ALTER TABLE public.admin_branch_scopes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_branch_scopes_school_select"
  ON public.admin_branch_scopes
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = admin_branch_scopes.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "admin_branch_scopes_school_insert"
  ON public.admin_branch_scopes
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = admin_branch_scopes.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "admin_branch_scopes_school_delete"
  ON public.admin_branch_scopes
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = admin_branch_scopes.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

-- ─── school_data_archives ───────────────────────────────────────────────────
-- Contains full JSON exports of school data — highly sensitive.

ALTER TABLE public.school_data_archives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "school_data_archives_school_select"
  ON public.school_data_archives
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (up.school_id = school_data_archives.school_id OR up.role = 'super_admin')
        AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "school_data_archives_school_insert"
  ON public.school_data_archives
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (up.school_id = school_data_archives.school_id OR up.role = 'super_admin')
        AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "school_data_archives_super_admin_delete"
  ON public.school_data_archives
  FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );
