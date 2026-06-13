-- ============================================================
-- Database fixes migration (verified against live DB state)
-- Applied: 2026-05-11
-- ============================================================

-- ============================================================
-- FIX 1: create_payment_atomic — add student status validation
-- Currently allows payments on transferred/deleted/suspended students
-- ============================================================

CREATE OR REPLACE FUNCTION create_payment_atomic(
  p_school_id     UUID,
  p_student_id    UUID,
  p_branch_id     UUID,
  p_amount        NUMERIC,
  p_payment_method TEXT,
  p_notes         TEXT,
  p_created_at    TIMESTAMPTZ,
  p_receipt_number TEXT,
  p_manual_receipt_number TEXT
)
RETURNS TABLE (
  id                    UUID,
  school_id             UUID,
  branch_id             UUID,
  student_id            UUID,
  amount                NUMERIC,
  payment_method        TEXT,
  notes                 TEXT,
  created_at            TIMESTAMPTZ,
  receipt_number        TEXT,
  manual_receipt_number TEXT,
  paid_fee_after        NUMERIC,
  remaining_fee_after   NUMERIC,
  error_code            TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student         RECORD;
  v_class_fee       NUMERIC;
  v_effective_total NUMERIC;
  v_effective_disc  NUMERIC;
  v_remaining       NUMERIC;
  v_sum_paid        NUMERIC;
  v_payment_id      UUID;
  v_created_at      TIMESTAMPTZ;
BEGIN
  -- Lock student row
  SELECT s.id, s.school_id, s.branch_id, s.total_fee, s.discount_value, s.class_name, s.status
    INTO v_student
    FROM students s
   WHERE s.id = p_student_id
     AND s.school_id = p_school_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      NULL::TEXT, NULL::TEXT,
      NULL::NUMERIC, NULL::NUMERIC,
      'STUDENT_NOT_FOUND'::TEXT;
    RETURN;
  END IF;

  -- NEW: Block payments on non-active students
  IF COALESCE(v_student.status, 'active') <> 'active' THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      NULL::TEXT, NULL::TEXT,
      NULL::NUMERIC, NULL::NUMERIC,
      ('STUDENT_STATUS_' || UPPER(COALESCE(v_student.status, 'unknown')))::TEXT;
    RETURN;
  END IF;

  -- Resolve class fee total if available
  IF v_student.class_name IS NOT NULL THEN
    SELECT cf.total_fee INTO v_class_fee
      FROM class_fees cf
     WHERE cf.school_id = p_school_id
       AND cf.class_name = v_student.class_name
     LIMIT 1;
  END IF;

  v_effective_total := COALESCE(v_class_fee, COALESCE(v_student.total_fee, 0));
  v_effective_disc  := COALESCE(v_student.discount_value, 0);

  SELECT COALESCE(SUM(pay.amount), 0) INTO v_sum_paid
    FROM payments pay
   WHERE pay.student_id = p_student_id
     AND pay.school_id  = p_school_id
     AND pay.deleted_at IS NULL;

  v_remaining := GREATEST(v_effective_total - v_sum_paid - v_effective_disc, 0);

  IF v_remaining <= 0 THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      NULL::TEXT, NULL::TEXT,
      v_sum_paid, 0::NUMERIC,
      'PAID_IN_FULL'::TEXT;
    RETURN;
  END IF;

  IF p_amount > v_remaining THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      NULL::TEXT, NULL::TEXT,
      v_sum_paid, v_remaining,
      'PAYMENT_EXCEEDS_REMAINING'::TEXT;
    RETURN;
  END IF;

  v_created_at := COALESCE(p_created_at, NOW());
  INSERT INTO payments (
    school_id, branch_id, student_id, amount, payment_method,
    notes, created_at, receipt_number, manual_receipt_number
  )
  VALUES (
    p_school_id, p_branch_id, p_student_id, p_amount, p_payment_method,
    p_notes, v_created_at, p_receipt_number, p_manual_receipt_number
  )
  RETURNING payments.id INTO v_payment_id;

  RETURN QUERY SELECT
    v_payment_id,
    p_school_id,
    p_branch_id,
    p_student_id,
    p_amount,
    p_payment_method,
    p_notes,
    v_created_at,
    p_receipt_number,
    p_manual_receipt_number,
    v_sum_paid + p_amount,
    GREATEST(v_effective_total - (v_sum_paid + p_amount) - v_effective_disc, 0),
    NULL::TEXT;
END;
$$;

-- ============================================================
-- FIX 2: school_reports_summary — 3 bugs:
--   a) payment_summary missing deleted_at IS NULL (counts deleted payments)
--   b) student_summary missing transferred exclusion
--   c) total_fees not resolved from class_fees
-- ============================================================

CREATE OR REPLACE FUNCTION public.school_reports_summary(
  p_school_id uuid,
  p_current_month text,
  p_today date
)
RETURNS TABLE (
  students_count bigint,
  active_students bigint,
  total_fees numeric,
  total_paid numeric,
  total_remaining numeric,
  payments_count bigint,
  payment_volume numeric,
  today_payments bigint,
  expenses_count bigint,
  expense_volume numeric,
  expense_type_count bigint,
  salaries_count bigint,
  salary_volume numeric,
  current_month_salary_count bigint,
  net_balance numeric
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH student_summary AS (
    SELECT
      count(*)::bigint AS students_count,
      count(*) FILTER (WHERE s.status = 'active')::bigint AS active_students,
      COALESCE(sum(COALESCE(cf.total_fee, s.total_fee, 0)), 0)::numeric AS total_fees,
      COALESCE(sum(s.paid_fee), 0)::numeric AS total_paid,
      COALESCE(sum(
        GREATEST(COALESCE(cf.total_fee, s.total_fee, 0) - COALESCE(s.paid_fee, 0) - COALESCE(s.discount_value, 0), 0)
      ), 0)::numeric AS total_remaining
    FROM public.students s
    LEFT JOIN public.class_fees cf
      ON cf.class_name = s.class_name
      AND cf.school_id = s.school_id
      AND (cf.branch_id IS NULL OR cf.branch_id = s.branch_id)
    WHERE s.school_id = p_school_id
      AND COALESCE(s.status, 'active') NOT IN ('deleted', 'transferred')
  ),
  payment_summary AS (
    SELECT
      count(*)::bigint AS payments_count,
      COALESCE(sum(amount), 0)::numeric AS payment_volume,
      count(*) FILTER (WHERE created_at::date = p_today)::bigint AS today_payments
    FROM public.payments
    WHERE school_id = p_school_id
      AND deleted_at IS NULL
  ),
  expense_summary AS (
    SELECT
      count(*)::bigint AS expenses_count,
      COALESCE(sum(e.amount), 0)::numeric AS expense_volume,
      count(DISTINCT et.name)::bigint AS expense_type_count
    FROM public.expenses e
    LEFT JOIN public.expense_types et ON et.id = e.expense_type_id
    WHERE e.school_id = p_school_id
  ),
  salary_summary AS (
    SELECT
      count(*)::bigint AS salaries_count,
      COALESCE(sum(GREATEST(COALESCE(gross_salary, 0) - COALESCE(deductions, 0), 0)), 0)::numeric AS salary_volume,
      count(*) FILTER (WHERE month = p_current_month)::bigint AS current_month_salary_count
    FROM public.salaries
    WHERE school_id = p_school_id
  )
  SELECT
    student_summary.students_count,
    student_summary.active_students,
    student_summary.total_fees,
    student_summary.total_paid,
    student_summary.total_remaining,
    payment_summary.payments_count,
    payment_summary.payment_volume,
    payment_summary.today_payments,
    expense_summary.expenses_count,
    expense_summary.expense_volume,
    expense_summary.expense_type_count,
    salary_summary.salaries_count,
    salary_summary.salary_volume,
    salary_summary.current_month_salary_count,
    payment_summary.payment_volume - expense_summary.expense_volume - salary_summary.salary_volume AS net_balance
  FROM student_summary, payment_summary, expense_summary, salary_summary;
$$;

GRANT EXECUTE ON FUNCTION public.school_reports_summary(uuid, text, date) TO authenticated, service_role;

-- ============================================================
-- FIX 3: Partial index on payments.deleted_at
-- Heavily used in WHERE deleted_at IS NULL across many queries
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_payments_deleted_at_null
  ON public.payments(student_id, school_id)
  WHERE deleted_at IS NULL;

-- ============================================================
-- FIX 4: Missing index on notifications.school_id
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_notifications_school_id
  ON public.notifications(school_id);
