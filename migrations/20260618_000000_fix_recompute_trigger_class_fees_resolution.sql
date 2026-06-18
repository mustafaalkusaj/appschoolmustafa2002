-- C14 FIX: recompute_student_payment_totals — resolve total_fee from class_fees first
-- Root cause: the trigger function used students.total_fee directly, while create_payment_atomic
-- resolves: COALESCE(class_fees.total_fee, students.total_fee). After a payment deletion fires
-- the trigger, remaining_fee was recalculated with the wrong total for students enrolled in a
-- class that has a class_fees row, causing remaining_fee to drift from what the RPC computes.
-- Fix: match the RPC resolution — prefer class_fees.total_fee, fall back to students.total_fee.

CREATE OR REPLACE FUNCTION public.recompute_student_payment_totals(target_student_id UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $body$
DECLARE
  next_paid_fee        NUMERIC := 0;
  student_total_fee    NUMERIC := 0;
  student_discount     NUMERIC := 0;
  student_class_name   TEXT;
  class_fee            NUMERIC;
  effective_total_fee  NUMERIC := 0;
  next_remaining_fee   NUMERIC := 0;
BEGIN
  IF target_student_id IS NULL THEN
    RETURN;
  END IF;

  -- Sum all non-voided payments for this student (idempotent)
  SELECT COALESCE(SUM(amount), 0)
    INTO next_paid_fee
    FROM public.payments
   WHERE student_id = target_student_id
     AND deleted_at IS NULL;

  -- Fetch student fields needed for fee resolution
  SELECT total_fee, discount_value, class_name
    INTO student_total_fee, student_discount, student_class_name
    FROM public.students
   WHERE id = target_student_id;

  student_total_fee := COALESCE(student_total_fee, 0);
  student_discount  := COALESCE(student_discount, 0);

  -- Resolve effective total_fee: prefer class_fees (matching create_payment_atomic logic)
  IF student_class_name IS NOT NULL THEN
    SELECT cf.total_fee
      INTO class_fee
      FROM public.class_fees cf
     WHERE cf.school_id = (SELECT school_id FROM public.students WHERE id = target_student_id)
       AND cf.class_name = student_class_name
     LIMIT 1;
  END IF;

  effective_total_fee := COALESCE(class_fee, student_total_fee);

  -- Calculate remaining (never negative for display)
  next_remaining_fee := GREATEST(effective_total_fee - next_paid_fee - student_discount, 0);

  -- Update student totals atomically (SET, not ADD)
  UPDATE public.students
     SET paid_fee      = next_paid_fee,
         remaining_fee = next_remaining_fee,
         updated_at    = NOW()
   WHERE id = target_student_id;
END;
$body$;

-- Backfill: recompute all students whose remaining_fee may be stale due to the old logic.
-- This targets only students enrolled in a class that has a class_fees row, since those are
-- the ones whose effective_total_fee could differ from students.total_fee.
DO $$
DECLARE
  fixed_count INT := 0;
BEGIN
  UPDATE public.students s
     SET paid_fee = recalc.next_paid,
         remaining_fee = recalc.next_remaining,
         updated_at = NOW()
    FROM (
      SELECT
        s2.id,
        COALESCE(p.total_paid, 0)                                                AS next_paid,
        GREATEST(
          COALESCE(cf.total_fee, s2.total_fee, 0)
          - COALESCE(p.total_paid, 0)
          - COALESCE(s2.discount_value, 0),
          0
        )                                                                         AS next_remaining
      FROM public.students s2
      LEFT JOIN public.class_fees cf
        ON cf.school_id = s2.school_id
       AND cf.class_name = s2.class_name
      LEFT JOIN (
        SELECT student_id, COALESCE(SUM(amount), 0) AS total_paid
          FROM public.payments
         WHERE deleted_at IS NULL
         GROUP BY student_id
      ) p ON p.student_id = s2.id
      -- Only touch students where class_fees resolution would change the result
      WHERE cf.total_fee IS NOT NULL
        AND cf.total_fee IS DISTINCT FROM s2.total_fee
    ) recalc
   WHERE s.id = recalc.id
     AND (s.paid_fee IS DISTINCT FROM recalc.next_paid
          OR s.remaining_fee IS DISTINCT FROM recalc.next_remaining);

  GET DIAGNOSTICS fixed_count = ROW_COUNT;
  RAISE NOTICE 'C14 backfill: corrected % student balance(s) using class_fees resolution', fixed_count;
END $$;
