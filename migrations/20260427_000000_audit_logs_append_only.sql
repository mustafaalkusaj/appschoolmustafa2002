-- audit_logs: prevent UPDATE, DELETE, and TRUNCATE even by service_role
-- Makes the table truly append-only for tamper-evident audit logging.
-- Fixes P-2601 identified in full QA audit 2026-04-27.

-- 1) Block UPDATE
CREATE OR REPLACE FUNCTION audit_logs_block_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only — UPDATE not allowed';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update
  BEFORE UPDATE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_block_update();

-- 2) Block DELETE
CREATE OR REPLACE FUNCTION audit_logs_block_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only — DELETE not allowed';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE TRIGGER audit_logs_no_delete
  BEFORE DELETE ON public.audit_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_logs_block_delete();

-- 3) Block TRUNCATE (statement-level trigger)
CREATE OR REPLACE FUNCTION audit_logs_block_truncate()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only — TRUNCATE not allowed';
END;
$$;

DROP TRIGGER IF EXISTS audit_logs_no_truncate ON public.audit_logs;
CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON public.audit_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION audit_logs_block_truncate();

-- 4) Document the intent
COMMENT ON TABLE public.audit_logs IS 'Append-only audit log. UPDATE/DELETE/TRUNCATE blocked by triggers. See migration 20260427_000000.';
