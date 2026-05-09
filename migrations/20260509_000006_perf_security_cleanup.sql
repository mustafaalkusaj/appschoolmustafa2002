-- Migration 000006: Security + Performance cleanup
-- 1. Restrict system/audit table RLS to service_role only
-- 2. Drop unused indexes on audit/feature/non-core tables
-- 3. Add 42 missing FK indexes

-- ============================================================
-- SECTION 1: Fix permissive system table RLS policies
-- These tables are server-internal; no authenticated user
-- should INSERT/UPDATE/DELETE directly via the Supabase client.
-- ============================================================

-- backup_logs
DROP POLICY IF EXISTS "Allow system to insert backup logs" ON public.backup_logs;
CREATE POLICY "service_role_insert_backup_logs"
  ON public.backup_logs FOR INSERT TO service_role WITH CHECK (true);

-- cache_stats
DROP POLICY IF EXISTS "System can insert cache stats" ON public.cache_stats;
CREATE POLICY "service_role_insert_cache_stats"
  ON public.cache_stats FOR INSERT TO service_role WITH CHECK (true);

-- connection_pool_metrics
DROP POLICY IF EXISTS "System can insert metrics" ON public.connection_pool_metrics;
CREATE POLICY "service_role_insert_connection_pool_metrics"
  ON public.connection_pool_metrics FOR INSERT TO service_role WITH CHECK (true);

-- deleted_data_archive
DROP POLICY IF EXISTS "Allow deletion archive inserts" ON public.deleted_data_archive;
CREATE POLICY "service_role_insert_deleted_data_archive"
  ON public.deleted_data_archive FOR INSERT TO service_role WITH CHECK (true);

-- dependency_audits
DROP POLICY IF EXISTS "System can insert audit records" ON public.dependency_audits;
CREATE POLICY "service_role_insert_dependency_audits"
  ON public.dependency_audits FOR INSERT TO service_role WITH CHECK (true);

-- encryption_keys
DROP POLICY IF EXISTS "Only system can update keys" ON public.encryption_keys;
DROP POLICY IF EXISTS "System can manage encryption keys" ON public.encryption_keys;
CREATE POLICY "service_role_manage_encryption_keys"
  ON public.encryption_keys FOR ALL TO service_role USING (true) WITH CHECK (true);

-- key_rotation_log
DROP POLICY IF EXISTS "System can log key rotation" ON public.key_rotation_log;
CREATE POLICY "service_role_insert_key_rotation_log"
  ON public.key_rotation_log FOR INSERT TO service_role WITH CHECK (true);

-- performance_metrics
DROP POLICY IF EXISTS "System can insert performance data" ON public.performance_metrics;
CREATE POLICY "service_role_insert_performance_metrics"
  ON public.performance_metrics FOR INSERT TO service_role WITH CHECK (true);

-- query_cache
DROP POLICY IF EXISTS "System can manage cache" ON public.query_cache;
DROP POLICY IF EXISTS "System can update cache" ON public.query_cache;
DROP POLICY IF EXISTS "System can delete cache" ON public.query_cache;
CREATE POLICY "service_role_manage_query_cache"
  ON public.query_cache FOR ALL TO service_role USING (true) WITH CHECK (true);

-- slow_query_log
DROP POLICY IF EXISTS "System can log slow queries" ON public.slow_query_log;
CREATE POLICY "service_role_insert_slow_query_log"
  ON public.slow_query_log FOR INSERT TO service_role WITH CHECK (true);

-- ============================================================
-- SECTION 2: Drop unused indexes on non-core / audit / future-feature tables
-- Skipping: students, payments, teachers, user_profiles, expenses,
--           salaries, attendance_records (core high-traffic tables)
-- ============================================================

-- fee_notifications
DROP INDEX IF EXISTS public.fee_notification_recipients_notif_idx;
DROP INDEX IF EXISTS public.fee_notifications_created_at_idx;
DROP INDEX IF EXISTS public.idx_fee_notifications_created_by;

-- activity_logs (audit)
DROP INDEX IF EXISTS public.idx_activity_logs_branch_id;
DROP INDEX IF EXISTS public.idx_activity_logs_entity;
DROP INDEX IF EXISTS public.idx_activity_logs_school;

-- audit_logs (audit)
DROP INDEX IF EXISTS public.idx_audit_logs_action_type;
DROP INDEX IF EXISTS public.idx_audit_logs_actor_id;
DROP INDEX IF EXISTS public.idx_audit_logs_created_at;
DROP INDEX IF EXISTS public.idx_audit_logs_entity_type;
DROP INDEX IF EXISTS public.idx_audit_logs_school_id;
DROP INDEX IF EXISTS public.idx_audit_action;
DROP INDEX IF EXISTS public.idx_audit_resource;
DROP INDEX IF EXISTS public.idx_audit_timestamp;

-- app_notifications (feature)
DROP INDEX IF EXISTS public.idx_app_notifications_created_at;
DROP INDEX IF EXISTS public.idx_app_notifications_recipient_user_id;
DROP INDEX IF EXISTS public.idx_app_notifications_status;

-- assignments (future feature)
DROP INDEX IF EXISTS public.idx_assignments_due_at;
DROP INDEX IF EXISTS public.idx_assignments_school_created_at;
DROP INDEX IF EXISTS public.idx_assignments_scope_lookup;
DROP INDEX IF EXISTS public.idx_assignments_teacher_id;
DROP INDEX IF EXISTS public.idx_assignments_text_scope_lookup;

-- attendance (old table — not attendance_records)
DROP INDEX IF EXISTS public.idx_attendance_date;
DROP INDEX IF EXISTS public.idx_attendance_school_id;

-- grades (future feature)
DROP INDEX IF EXISTS public.idx_grades_assignment_id;
DROP INDEX IF EXISTS public.idx_grades_school_id;
DROP INDEX IF EXISTS public.idx_grades_scope_lookup;
DROP INDEX IF EXISTS public.idx_grades_teacher_id;

-- group_alerts
DROP INDEX IF EXISTS public.idx_group_alerts_group_id;
DROP INDEX IF EXISTS public.idx_group_alerts_is_read;

-- installments
DROP INDEX IF EXISTS public.idx_installments_due;

-- notifications
DROP INDEX IF EXISTS public.idx_notifications_is_read;

-- subjects (future feature)
DROP INDEX IF EXISTS public.idx_subjects_school_id;
DROP INDEX IF EXISTS public.idx_subjects_school_name;
DROP INDEX IF EXISTS public.idx_subjects_school_status;

-- support_tickets
DROP INDEX IF EXISTS public.idx_support_tickets_created_at;
DROP INDEX IF EXISTS public.idx_support_tickets_status;

-- weekly_schedule / class_schedules (future feature)
DROP INDEX IF EXISTS public.idx_weekly_schedule_school_id;
DROP INDEX IF EXISTS public.idx_class_schedules_school;

-- school_data_archives
DROP INDEX IF EXISTS public.idx_school_data_archives_school_created_at;

-- branches admin/config (low traffic)
DROP INDEX IF EXISTS public.idx_branch_receipt_config_updated_at;
DROP INDEX IF EXISTS public.idx_school_receipt_config_updated_at;
DROP INDEX IF EXISTS public.idx_branches_group_id;

-- financial
DROP INDEX IF EXISTS public.idx_financial_branch_month;

-- managed users
DROP INDEX IF EXISTS public.idx_managed_user_credentials_school_id;
DROP INDEX IF EXISTS public.idx_managed_user_profiles_student_id;
DROP INDEX IF EXISTS public.idx_managed_user_profiles_teacher_id;

-- expenses audit log
DROP INDEX IF EXISTS public.idx_expenses_audit_log_expense_id;
DROP INDEX IF EXISTS public.idx_expenses_audit_log_school_id;

-- schools admin
DROP INDEX IF EXISTS public.idx_schools_group_id;

-- user page access
DROP INDEX IF EXISTS public.idx_user_page_access_branch;
DROP INDEX IF EXISTS public.idx_user_page_access_user;

-- user role assignments (keep school_id, drop others)
DROP INDEX IF EXISTS public.idx_user_role_assignments_branch;
DROP INDEX IF EXISTS public.idx_user_role_assignments_role_id;

-- ============================================================
-- SECTION 3: Add missing FK indexes (42 total)
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_activity_logs_created_by ON public.activity_logs (created_by);
CREATE INDEX IF NOT EXISTS idx_admin_branch_scopes_branch_id ON public.admin_branch_scopes (branch_id);
CREATE INDEX IF NOT EXISTS idx_admin_branch_scopes_school_id ON public.admin_branch_scopes (school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_class_id ON public.assignments (class_id);
CREATE INDEX IF NOT EXISTS idx_assignments_section_id ON public.assignments (section_id);
CREATE INDEX IF NOT EXISTS idx_assignments_subject_id ON public.assignments (subject_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch_id ON public.attendance (branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_recorded_by ON public.attendance (recorded_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_audit_log_changed_by ON public.attendance_records_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_attendance_records_audit_log_school_id ON public.attendance_records_audit_log (school_id);
CREATE INDEX IF NOT EXISTS idx_branch_receipt_config_updated_by ON public.branch_receipt_config (updated_by);
CREATE INDEX IF NOT EXISTS idx_branches_deleted_by ON public.branches (deleted_by);
CREATE INDEX IF NOT EXISTS idx_budget_items_branch_id ON public.budget_items (branch_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON public.budget_items (budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_school_id ON public.budget_items (school_id);
CREATE INDEX IF NOT EXISTS idx_budgets_created_by ON public.budgets (created_by);
CREATE INDEX IF NOT EXISTS idx_deductions_updated_by ON public.deductions (updated_by);
CREATE INDEX IF NOT EXISTS idx_deleted_data_archive_deleted_by ON public.deleted_data_archive (deleted_by);
CREATE INDEX IF NOT EXISTS idx_discounts_approved_by ON public.discounts (approved_by);
CREATE INDEX IF NOT EXISTS idx_expense_types_deleted_by ON public.expense_types (deleted_by);
CREATE INDEX IF NOT EXISTS idx_expense_types_updated_by ON public.expense_types (updated_by);
CREATE INDEX IF NOT EXISTS idx_expenses_audit_log_changed_by ON public.expenses_audit_log (changed_by);
CREATE INDEX IF NOT EXISTS idx_financial_summary_school_id ON public.financial_summary (school_id);
CREATE INDEX IF NOT EXISTS idx_grades_class_id ON public.grades (class_id);
CREATE INDEX IF NOT EXISTS idx_grades_section_id ON public.grades (section_id);
CREATE INDEX IF NOT EXISTS idx_grades_subject_id ON public.grades (subject_id);
CREATE INDEX IF NOT EXISTS idx_group_alerts_branch_id ON public.group_alerts (branch_id);
CREATE INDEX IF NOT EXISTS idx_installments_school_id ON public.installments (school_id);
CREATE INDEX IF NOT EXISTS idx_job_titles_school_id ON public.job_titles (school_id);
CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_created_by ON public.managed_user_profiles (created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.notifications (school_id);
CREATE INDEX IF NOT EXISTS idx_platform_settings_updated_by ON public.platform_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_salary_archives_school_id ON public.salary_archives (school_id);
CREATE INDEX IF NOT EXISTS idx_school_branding_settings_updated_by ON public.school_branding_settings (updated_by);
CREATE INDEX IF NOT EXISTS idx_school_data_archives_created_by ON public.school_data_archives (created_by);
CREATE INDEX IF NOT EXISTS idx_school_receipt_config_updated_by ON public.school_receipt_config (updated_by);
CREATE INDEX IF NOT EXISTS idx_schools_deleted_by ON public.schools (deleted_by);
CREATE INDEX IF NOT EXISTS idx_subscriptions_school_id ON public.subscriptions (school_id);
CREATE INDEX IF NOT EXISTS idx_user_page_access_school_id ON public.user_page_access (school_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_branch_id ON public.user_permissions (branch_id);
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_school_id ON public.weekly_schedule (school_id);
CREATE INDEX IF NOT EXISTS idx_weekly_schedule_teacher_id ON public.weekly_schedule (teacher_id);
