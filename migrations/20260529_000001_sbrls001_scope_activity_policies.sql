-- ============================================================================
-- SB-RLS-001 FIX — replace permissive USING(true) policies on the teacher
-- activity tables with proper school/branch-scoped policies.
-- ============================================================================
-- المشكلة: 5 جداول عليها سياسة `service_full_access_*` بـ USING(true)+WITH CHECK(true)
-- لدور authenticated → أي مستخدم موثّق (بما فيهم مستخدمو الموبايل الذين يقرأون Supabase
-- مباشرة) يقرأ/يكتب نشاطات كل المدارس. مؤكّد runtime: admin مدرسة A قرأ نشاط مدرسة B.
-- الإصلاح: تقييد بـ current_user_can_access_branch (نفس نمط جدول students).
-- service_role يتجاوز RLS، فمسارات التطبيق بـ service-role لا تتأثر.
--
-- ⚠️ يُختبر على بيئة آمنة ثم يُنشر (قاعدة #2).
-- ============================================================================

-- teacher_activities (school_id, branch_id)
DROP POLICY IF EXISTS service_full_access_teacher_activities ON public.teacher_activities;
CREATE POLICY teacher_activities_branch_scope ON public.teacher_activities
  FOR ALL TO authenticated
  USING (public.current_user_can_access_branch(branch_id, school_id))
  WITH CHECK (public.current_user_can_access_branch(branch_id, school_id));

-- activity_monitoring_settings (school_id, branch_id)
DROP POLICY IF EXISTS service_full_access_activity_monitoring_settings ON public.activity_monitoring_settings;
CREATE POLICY activity_monitoring_settings_branch_scope ON public.activity_monitoring_settings
  FOR ALL TO authenticated
  USING (public.current_user_can_access_branch(branch_id, school_id))
  WITH CHECK (public.current_user_can_access_branch(branch_id, school_id));

-- activity_attachments (activity_id -> parent teacher_activities)
DROP POLICY IF EXISTS service_full_access_activity_attachments ON public.activity_attachments;
CREATE POLICY activity_attachments_parent_scope ON public.activity_attachments
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_id
                 AND public.current_user_can_access_branch(ta.branch_id, ta.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_id
                 AND public.current_user_can_access_branch(ta.branch_id, ta.school_id)));

-- activity_reports (activity_id -> parent)
DROP POLICY IF EXISTS service_full_access_activity_reports ON public.activity_reports;
CREATE POLICY activity_reports_parent_scope ON public.activity_reports
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_id
                 AND public.current_user_can_access_branch(ta.branch_id, ta.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_id
                 AND public.current_user_can_access_branch(ta.branch_id, ta.school_id)));

-- activity_views (activity_id -> parent)
DROP POLICY IF EXISTS service_full_access_activity_views ON public.activity_views;
CREATE POLICY activity_views_parent_scope ON public.activity_views
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_id
                 AND public.current_user_can_access_branch(ta.branch_id, ta.school_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.teacher_activities ta WHERE ta.id = activity_id
                 AND public.current_user_can_access_branch(ta.branch_id, ta.school_id)));
