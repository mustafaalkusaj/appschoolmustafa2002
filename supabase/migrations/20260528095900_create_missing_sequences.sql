-- DRIFT FIX: schema baseline (20260528100000) references sequences in column
-- DEFAULTs but never creates them, so the migration set is NOT applicable from
-- scratch (supabase db reset / fresh deploy fails at the payments table).
-- Production already has these sequences, so this migration is a no-op there
-- (IF NOT EXISTS) and makes the migration history reproducible everywhere.
CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.audit_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.backup_logs_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.cache_stats_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.connection_pool_metrics_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.deleted_data_archive_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.dependency_audits_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.encryption_keys_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.key_rotation_log_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.performance_metrics_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.query_cache_id_seq;
CREATE SEQUENCE IF NOT EXISTS public.slow_query_log_id_seq;
