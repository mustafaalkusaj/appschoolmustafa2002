-- ============================================================
-- Audit remediation — changes applied to prod via Supabase MCP on 2026-06-20/21.
-- Recorded here for repo/migration-history parity. Idempotent where possible.
-- ============================================================

-- (round 1) behavior_logs employee SELECT/INSERT/DELETE policies
DROP POLICY IF EXISTS "behavior_logs_employee_select_policy" ON public.behavior_logs;
CREATE POLICY "behavior_logs_employee_select_policy"
  ON public.behavior_logs FOR SELECT TO authenticated
  USING (current_app_role() = 'employee'::text AND school_id = current_school_id());
DROP POLICY IF EXISTS "behavior_logs_employee_insert_policy" ON public.behavior_logs;
CREATE POLICY "behavior_logs_employee_insert_policy"
  ON public.behavior_logs FOR INSERT TO authenticated
  WITH CHECK (current_app_role() = 'employee'::text AND school_id = current_school_id());
DROP POLICY IF EXISTS "behavior_logs_employee_delete_policy" ON public.behavior_logs;
CREATE POLICY "behavior_logs_employee_delete_policy"
  ON public.behavior_logs FOR DELETE TO authenticated
  USING (current_app_role() = 'employee'::text AND school_id = current_school_id());

-- payments.verification_token: default + (one-time) backfill done on prod
ALTER TABLE public.payments ALTER COLUMN verification_token SET DEFAULT gen_random_uuid();

-- financial_summary: recompute from live SUM on INSERT/UPDATE/DELETE (was insert-only)
CREATE OR REPLACE FUNCTION public.update_financial_summary()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_row record := COALESCE(NEW, OLD);
  v_month text := TO_CHAR(v_row.created_at, 'YYYY-MM');
  v_total numeric;
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total FROM public.payments
   WHERE branch_id IS NOT DISTINCT FROM v_row.branch_id
     AND TO_CHAR(created_at, 'YYYY-MM') = v_month AND deleted_at IS NULL;
  INSERT INTO public.financial_summary (school_id, branch_id, month, total_income)
  VALUES (v_row.school_id, v_row.branch_id, v_month, v_total)
  ON CONFLICT (branch_id, month) DO UPDATE SET total_income = EXCLUDED.total_income, updated_at = NOW();
  RETURN NULL;
END; $$;
DROP TRIGGER IF EXISTS trg_update_financial_summary ON public.payments;
CREATE TRIGGER trg_update_financial_summary
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_financial_summary();

-- Drop teacher cleartext password column (code no longer writes it)
ALTER TABLE public.teachers DROP COLUMN IF EXISTS app_password_plain;

-- Widen student money columns integer -> numeric(14,2) (remaining_fee is generated)
ALTER TABLE public.students DROP COLUMN IF EXISTS remaining_fee;
ALTER TABLE public.students
  ALTER COLUMN paid_fee TYPE numeric(14,2),
  ALTER COLUMN total_fee TYPE numeric(14,2),
  ALTER COLUMN discount_value TYPE numeric(14,2);
ALTER TABLE public.students
  ADD COLUMN remaining_fee numeric(14,2)
  GENERATED ALWAYS AS ((total_fee - paid_fee) - discount_value) STORED;

-- recompute precision (drop ROUND now that columns are numeric) — base function in
-- 20260620200000_fix_recompute_student_payment_totals.sql
CREATE OR REPLACE FUNCTION public.recompute_student_payment_totals(target_student_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  next_paid_fee NUMERIC := 0; effective_total NUMERIC := 0;
  v_school_id uuid; v_class_name text;
BEGIN
  IF target_student_id IS NULL THEN RETURN; END IF;
  SELECT COALESCE(SUM(amount), 0) INTO next_paid_fee FROM public.payments
   WHERE student_id = target_student_id AND deleted_at IS NULL;
  SELECT school_id, class_name INTO v_school_id, v_class_name FROM public.students WHERE id = target_student_id;
  SELECT COALESCE(
    (SELECT cf.total_fee FROM public.class_fees cf WHERE cf.class_name = v_class_name AND cf.school_id = v_school_id LIMIT 1),
    (SELECT s.total_fee FROM public.students s WHERE s.id = target_student_id)
  ) INTO effective_total;
  UPDATE public.students SET paid_fee = next_paid_fee, total_fee = COALESCE(effective_total, total_fee)
   WHERE id = target_student_id;
END; $$;
