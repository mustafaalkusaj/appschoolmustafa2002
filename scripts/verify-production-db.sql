-- Runtime database verification for production or staging.
-- Usage:
--   psql "$DATABASE_URL" -f scripts/verify-production-db.sql
--
-- This checks:
-- - required helper functions
-- - required high-risk tables
-- - RLS enabled state
-- - active policies on critical tables
-- - important indexes for managed users and teacher assignments

\echo '=== Required Functions ==='
SELECT
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments
FROM pg_proc AS p
JOIN pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'school_reports_summary',
    'current_app_role',
    'current_school_id',
    'current_managed_role',
    'current_managed_school_id',
    'current_managed_teacher_id',
    'current_managed_is_active'
  )
ORDER BY p.proname;

\echo ''
\echo '=== Critical Tables / RLS State ==='
SELECT
  schemaname,
  tablename,
  rowsecurity,
  hasrules
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'managed_user_profiles',
    'managed_user_credentials',
    'teacher_assignments',
    'students',
    'teachers',
    'schools',
    'subscriptions'
  )
ORDER BY tablename;

\echo ''
\echo '=== Critical Policies ==='
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'managed_user_profiles',
    'managed_user_credentials',
    'teacher_assignments'
  )
ORDER BY tablename, policyname;

\echo ''
\echo '=== Important Indexes ==='
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND (
    (tablename = 'managed_user_profiles' AND indexname IN (
      'idx_managed_user_profiles_school_id',
      'idx_managed_user_profiles_role_status',
      'idx_managed_user_profiles_student_unique',
      'idx_managed_user_profiles_teacher_unique',
      'idx_managed_user_profiles_school_email_unique'
    ))
    OR
    (tablename = 'managed_user_credentials' AND indexname IN (
      'idx_managed_user_credentials_school_login_unique',
      'idx_managed_user_credentials_school_id'
    ))
    OR
    (tablename = 'teacher_assignments' AND indexname IN (
      'idx_teacher_assignments_unique_classwide',
      'idx_teacher_assignments_unique_section',
      'idx_teacher_assignments_teacher_id',
      'idx_teacher_assignments_school_scope'
    ))
  )
ORDER BY tablename, indexname;

\echo ''
\echo '=== school_reports_summary Smoke ==='
SELECT *
FROM public.school_reports_summary(
  '00000000-0000-0000-0000-000000000001'::uuid,
  to_char(current_date, 'YYYY-MM'),
  current_date
)
LIMIT 1;
