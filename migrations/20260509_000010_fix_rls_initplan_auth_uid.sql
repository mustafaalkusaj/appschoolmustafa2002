-- Migration 000010: Fix auth_rls_initplan warnings
-- Replace bare auth.uid() with (SELECT auth.uid()) in EXISTS() subqueries
-- so auth function is evaluated once per query, not per row.

-- branches
DROP POLICY IF EXISTS "super_admin_modify_branches" ON public.branches;
DROP POLICY IF EXISTS "super_admin_update_branches" ON public.branches;
DROP POLICY IF EXISTS "super_admin_delete_branches" ON public.branches;
CREATE POLICY "super_admin_modify_branches"
  ON public.branches FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'));
CREATE POLICY "super_admin_update_branches"
  ON public.branches FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'));
CREATE POLICY "super_admin_delete_branches"
  ON public.branches FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'));

-- school_groups
DROP POLICY IF EXISTS "super_admin_insert_school_groups" ON public.school_groups;
DROP POLICY IF EXISTS "super_admin_update_school_groups" ON public.school_groups;
DROP POLICY IF EXISTS "super_admin_delete_school_groups" ON public.school_groups;
CREATE POLICY "super_admin_insert_school_groups"
  ON public.school_groups FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'));
CREATE POLICY "super_admin_update_school_groups"
  ON public.school_groups FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'));
CREATE POLICY "super_admin_delete_school_groups"
  ON public.school_groups FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.role = 'super_admin'));

-- class_schedules
DROP POLICY IF EXISTS "school_schedules_insert" ON public.class_schedules;
DROP POLICY IF EXISTS "school_schedules_update" ON public.class_schedules;
DROP POLICY IF EXISTS "school_schedules_delete" ON public.class_schedules;
CREATE POLICY "school_schedules_insert"
  ON public.class_schedules FOR INSERT TO public
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.school_id = class_schedules.school_id AND up.role IN ('super_admin', 'admin')));
CREATE POLICY "school_schedules_update"
  ON public.class_schedules FOR UPDATE TO public
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.school_id = class_schedules.school_id AND up.role IN ('super_admin', 'admin')));
CREATE POLICY "school_schedules_delete"
  ON public.class_schedules FOR DELETE TO public
  USING (EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.id = (SELECT auth.uid()) AND up.school_id = class_schedules.school_id AND up.role IN ('super_admin', 'admin')));

-- user_profiles
DROP POLICY IF EXISTS "user_profiles_select" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_insert" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_update" ON public.user_profiles;
DROP POLICY IF EXISTS "user_profiles_delete" ON public.user_profiles;
CREATE POLICY "user_profiles_select"
  ON public.user_profiles FOR SELECT TO public
  USING (id = (SELECT auth.uid()) OR school_id = get_current_user_school_id());
CREATE POLICY "user_profiles_insert"
  ON public.user_profiles FOR INSERT TO public
  WITH CHECK (id = (SELECT auth.uid()));
CREATE POLICY "user_profiles_update"
  ON public.user_profiles FOR UPDATE TO public
  USING (id = (SELECT auth.uid()));
CREATE POLICY "user_profiles_delete"
  ON public.user_profiles FOR DELETE TO public
  USING (id = (SELECT auth.uid()));
