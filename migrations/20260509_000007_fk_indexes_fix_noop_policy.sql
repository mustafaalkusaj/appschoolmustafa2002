-- Migration 000007: Add 23 missing FK indexes + drop no-op RLS policy

-- SECTION 1: Drop no-op fee_notifications policy
-- fee_notifications_service_only uses USING(false) — overridden by OR
-- logic of other permissive policies, pure evaluation overhead.
DROP POLICY IF EXISTS "fee_notifications_service_only" ON public.fee_notifications;

-- SECTION 2: Add 23 missing FK covering indexes
CREATE INDEX IF NOT EXISTS idx_activity_logs_branch_id ON public.activity_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_school_id ON public.activity_logs (school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_school_id ON public.assignments (school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher_id ON public.assignments (teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON public.attendance (school_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs (actor_id);
CREATE INDEX IF NOT EXISTS idx_branches_group_id ON public.branches (group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_audit_log_school_id ON public.expenses_audit_log (school_id);
CREATE INDEX IF NOT EXISTS idx_fee_notification_recipients_fee_notification_id ON public.fee_notification_recipients (fee_notification_id);
CREATE INDEX IF NOT EXISTS idx_fee_notifications_created_by ON public.fee_notifications (created_by);
CREATE INDEX IF NOT EXISTS idx_grades_assignment_id ON public.grades (assignment_id);
CREATE INDEX IF NOT EXISTS idx_grades_school_id ON public.grades (school_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher_id ON public.grades (teacher_id);
CREATE INDEX IF NOT EXISTS idx_group_alerts_group_id ON public.group_alerts (group_id);
CREATE INDEX IF NOT EXISTS idx_managed_user_credentials_school_id ON public.managed_user_credentials (school_id);
CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_student_id ON public.managed_user_profiles (student_id);
CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_teacher_id ON public.managed_user_profiles (teacher_id);
CREATE INDEX IF NOT EXISTS idx_school_data_archives_school_id ON public.school_data_archives (school_id);
CREATE INDEX IF NOT EXISTS idx_schools_group_id ON public.schools (group_id);
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects (school_id);
CREATE INDEX IF NOT EXISTS idx_user_page_access_branch_id ON public.user_page_access (branch_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_branch_id ON public.user_role_assignments (branch_id);
CREATE INDEX IF NOT EXISTS idx_user_role_assignments_role_id ON public.user_role_assignments (role_id);
