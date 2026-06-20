-- CRITICAL FIX: teacher_activities RLS — remove USING(true) open policies
-- All 5 tables had USING(true) WITH CHECK(true) on authenticated role,
-- meaning any logged-in user across all schools had full read/write/delete access.
-- Replace with school-scoped + branch-scoped policies matching the rest of the codebase.

BEGIN;

-- ============================================================
-- 1. teacher_activities
-- ============================================================
DROP POLICY IF EXISTS "service_full_access_teacher_activities" ON public.teacher_activities;

CREATE POLICY teacher_activities_select ON public.teacher_activities
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teacher_activities.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND teacher_activities.school_id = up.school_id AND teacher_activities.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY teacher_activities_insert ON public.teacher_activities
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teacher_activities.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teacher_activities.school_id = up.school_id AND teacher_activities.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY teacher_activities_update ON public.teacher_activities
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teacher_activities.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teacher_activities.school_id = up.school_id AND teacher_activities.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teacher_activities.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teacher_activities.school_id = up.school_id AND teacher_activities.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY teacher_activities_delete ON public.teacher_activities
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND teacher_activities.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND teacher_activities.school_id = up.school_id AND teacher_activities.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- 2. activity_attachments (via activity join to school/branch)
-- ============================================================
DROP POLICY IF EXISTS "service_full_access_activity_attachments" ON public.activity_attachments;

CREATE POLICY activity_attachments_select ON public.activity_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_attachments.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_attachments_insert ON public.activity_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_attachments.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_attachments_update ON public.activity_attachments
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_attachments.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_attachments.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_attachments_delete ON public.activity_attachments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_attachments.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- 3. activity_views (teachers see own activity views; admins see all in scope)
-- ============================================================
DROP POLICY IF EXISTS "service_full_access_activity_views" ON public.activity_views;

CREATE POLICY activity_views_select ON public.activity_views
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_views.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_views_insert ON public.activity_views
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_views.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_views_update ON public.activity_views
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_views.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_views.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_views_delete ON public.activity_views
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_views.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

-- ============================================================
-- 4. activity_monitoring_settings (school+branch scoped)
-- ============================================================
DROP POLICY IF EXISTS "service_full_access_activity_monitoring_settings" ON public.activity_monitoring_settings;

CREATE POLICY activity_monitoring_select ON public.activity_monitoring_settings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND activity_monitoring_settings.school_id = up.school_id)
           OR (up.scope_level IN ('branch_user', 'restricted') AND activity_monitoring_settings.school_id = up.school_id AND activity_monitoring_settings.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_monitoring_insert ON public.activity_monitoring_settings
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND activity_monitoring_settings.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND activity_monitoring_settings.school_id = up.school_id AND activity_monitoring_settings.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_monitoring_update ON public.activity_monitoring_settings
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND activity_monitoring_settings.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND activity_monitoring_settings.school_id = up.school_id AND activity_monitoring_settings.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND activity_monitoring_settings.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND activity_monitoring_settings.school_id = up.school_id AND activity_monitoring_settings.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_monitoring_delete ON public.activity_monitoring_settings
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND up.scope_level IN ('super_admin', 'group_admin')
         AND (up.scope_level = 'super_admin' OR activity_monitoring_settings.school_id = up.school_id)
    )
  );

-- ============================================================
-- 5. activity_reports (reporter can see own; admins see in-scope)
-- ============================================================
DROP POLICY IF EXISTS "service_full_access_activity_reports" ON public.activity_reports;

CREATE POLICY activity_reports_select ON public.activity_reports
  FOR SELECT TO authenticated
  USING (
    reported_by = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_reports.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_reports_insert ON public.activity_reports
  FOR INSERT TO authenticated
  WITH CHECK (reported_by = (SELECT auth.uid()));

CREATE POLICY activity_reports_update ON public.activity_reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_reports.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.teacher_activities ta
        JOIN user_profiles up ON up.id = (SELECT auth.uid())
       WHERE ta.id = activity_reports.activity_id
         AND (
           up.scope_level = 'super_admin'
           OR (up.scope_level = 'group_admin' AND ta.school_id = up.school_id)
           OR (up.scope_level = 'branch_user' AND ta.school_id = up.school_id AND ta.branch_id = up.branch_id)
         )
    )
  );

CREATE POLICY activity_reports_delete ON public.activity_reports
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles up
       WHERE up.id = (SELECT auth.uid())
         AND up.scope_level IN ('super_admin', 'group_admin')
    )
  );

COMMIT;
