-- Migration 000009: Fix multiple permissive SELECT policies
-- Problem: tables with an ALL policy + a separate SELECT policy cause
-- Postgres to evaluate BOTH as OR on every SELECT (performance overhead).
-- Fix: split each ALL policy into INSERT + UPDATE + DELETE, letting the
-- dedicated SELECT policy be the only SELECT path.

-- ============================================================
-- branches
-- ============================================================
DROP POLICY IF EXISTS "super_admin_all_branches" ON public.branches;
CREATE POLICY "super_admin_modify_branches"
  ON public.branches FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));
CREATE POLICY "super_admin_update_branches"
  ON public.branches FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));
CREATE POLICY "super_admin_delete_branches"
  ON public.branches FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));

-- ============================================================
-- school_groups
-- ============================================================
DROP POLICY IF EXISTS "super_admin_all_school_groups" ON public.school_groups;
CREATE POLICY "super_admin_insert_school_groups"
  ON public.school_groups FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));
CREATE POLICY "super_admin_update_school_groups"
  ON public.school_groups FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));
CREATE POLICY "super_admin_delete_school_groups"
  ON public.school_groups FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'super_admin'
  ));

-- ============================================================
-- class_schedules
-- ============================================================
DROP POLICY IF EXISTS "school_schedules_modify" ON public.class_schedules;
CREATE POLICY "school_schedules_insert"
  ON public.class_schedules FOR INSERT TO public
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.school_id = class_schedules.school_id
      AND up.role IN ('super_admin', 'admin')
  ));
CREATE POLICY "school_schedules_update"
  ON public.class_schedules FOR UPDATE TO public
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.school_id = class_schedules.school_id
      AND up.role IN ('super_admin', 'admin')
  ));
CREATE POLICY "school_schedules_delete"
  ON public.class_schedules FOR DELETE TO public
  USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.school_id = class_schedules.school_id
      AND up.role IN ('super_admin', 'admin')
  ));

-- ============================================================
-- school_receipt_config
-- ============================================================
DROP POLICY IF EXISTS "school_receipt_config_super_admin" ON public.school_receipt_config;
CREATE POLICY "school_receipt_config_insert"
  ON public.school_receipt_config FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin');
CREATE POLICY "school_receipt_config_update"
  ON public.school_receipt_config FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin');
CREATE POLICY "school_receipt_config_delete"
  ON public.school_receipt_config FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin');

-- ============================================================
-- branch_receipt_config
-- ============================================================
DROP POLICY IF EXISTS "branch_receipt_config_super_admin" ON public.branch_receipt_config;
CREATE POLICY "branch_receipt_config_insert"
  ON public.branch_receipt_config FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin');
CREATE POLICY "branch_receipt_config_update"
  ON public.branch_receipt_config FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin');
CREATE POLICY "branch_receipt_config_delete"
  ON public.branch_receipt_config FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin');

-- ============================================================
-- school_branding_settings
-- ============================================================
DROP POLICY IF EXISTS "school_branding_settings_write_policy" ON public.school_branding_settings;
CREATE POLICY "school_branding_settings_insert"
  ON public.school_branding_settings FOR INSERT TO authenticated
  WITH CHECK (
    current_app_role() = 'super_admin'
    OR (current_app_role() = 'admin' AND school_id = current_school_id())
  );
CREATE POLICY "school_branding_settings_update"
  ON public.school_branding_settings FOR UPDATE TO authenticated
  USING (
    current_app_role() = 'super_admin'
    OR (current_app_role() = 'admin' AND school_id = current_school_id())
  );
CREATE POLICY "school_branding_settings_delete"
  ON public.school_branding_settings FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin');

-- ============================================================
-- audit_logs: split super_admin ALL → non-SELECT only
-- (service_role ALL stays; authenticated SELECT stays)
-- ============================================================
DROP POLICY IF EXISTS "audit_logs_super_admin_all" ON public.audit_logs;
CREATE POLICY "audit_logs_super_admin_write"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'super_admin');
CREATE POLICY "audit_logs_super_admin_update"
  ON public.audit_logs FOR UPDATE TO authenticated
  USING (current_app_role() = 'super_admin');
CREATE POLICY "audit_logs_super_admin_delete"
  ON public.audit_logs FOR DELETE TO authenticated
  USING (current_app_role() = 'super_admin');

-- ============================================================
-- user_profiles: merge two SELECT policies into one,
-- keep INSERT/UPDATE/DELETE scoped to own row
-- ============================================================
DROP POLICY IF EXISTS "user_profiles_own_row" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_same_school" ON public.user_profiles;

-- Single SELECT: own row OR same school
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT TO public
  USING (
    id = auth.uid()
    OR school_id = get_current_user_school_id()
  );

-- Write: own row only
CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT TO public
  WITH CHECK (id = auth.uid());
CREATE POLICY "user_profiles_update"
  ON public.user_profiles FOR UPDATE TO public
  USING (id = auth.uid());
CREATE POLICY "user_profiles_delete"
  ON public.user_profiles FOR DELETE TO public
  USING (id = auth.uid());
