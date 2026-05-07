-- C-3: Atomic payment creation with row-level locking to prevent race conditions
-- Replaces application-level check-then-act pattern with a Postgres-level atomic function.
-- Uses SELECT ... FOR UPDATE on the student row to serialize concurrent payment attempts.

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
  -- Lock the student row to prevent concurrent payment inserts
  SELECT id, school_id, branch_id, total_fee, discount_value, class_name
    INTO v_student
    FROM students
   WHERE id = p_student_id
     AND school_id = p_school_id
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

  -- Resolve class fee total if available
  IF v_student.class_name IS NOT NULL THEN
    SELECT total_fee INTO v_class_fee
      FROM class_fees
     WHERE school_id = p_school_id
       AND class_name = v_student.class_name
     LIMIT 1;
  END IF;

  v_effective_total := COALESCE(v_class_fee, COALESCE(v_student.total_fee, 0));
  v_effective_disc  := COALESCE(v_student.discount_value, 0);

  -- Compute authoritative paid sum from DB (not application layer)
  SELECT COALESCE(SUM(amount), 0) INTO v_sum_paid
    FROM payments
   WHERE student_id = p_student_id
     AND school_id  = p_school_id
     AND deleted_at IS NULL;

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

  -- Insert payment
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
    NULL::TEXT;  -- no error
END;
$$;

COMMENT ON FUNCTION create_payment_atomic IS
  'Atomically creates a payment with FOR UPDATE lock on the student row to prevent concurrent double-payments. Returns error_code IS NOT NULL on validation failure.';
