-- CRITICAL: Remove old duplicate trigger that increments paid_fee
-- This trigger was causing double deduction: old trigger + new trigger both firing
-- Evidence: paid_fee = 200,000 when SUM(payments) = 100,000 for student "اركان صايب"

DO $$
BEGIN
  -- 1. DROP the old buggy increment trigger
  DROP TRIGGER IF EXISTS trg_update_paid_fee ON public.payments;
  RAISE NOTICE 'Dropped old trg_update_paid_fee trigger';

  -- Do NOT drop the correct trigger:
  -- trg_sync_student_payment_totals_on_payments is the correct one that recalculates from SUM

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error dropping old trigger: %', SQLERRM;
  RAISE;
END $$;

-- 2. CORRECT BACKFILL: Recalculate all student balances from SUM(payments) + class_fees
-- This uses idempotent logic: replaces values, not increments
DO $$
DECLARE
  v_updated_count INT;
BEGIN
  UPDATE public.students s
  SET
    paid_fee = COALESCE(p.total_paid, 0),
    remaining_fee = GREATEST(
      COALESCE(
        -- Resolve real total_fee: use class_fees if exists AND students.total_fee is 0, else students.total_fee
        CASE
          WHEN s.total_fee = 0 THEN COALESCE(cf.total_fee, 0)
          ELSE s.total_fee
        END,
        0
      ) - COALESCE(p.total_paid, 0) - COALESCE(s.discount_value, 0),
      0
    ),
    updated_at = NOW()
  FROM (
    SELECT
      st.id AS student_id,
      COALESCE(SUM(pay.amount), 0) AS total_paid
    FROM public.students st
    LEFT JOIN public.payments pay
      ON pay.student_id = st.id
      AND (pay.deleted_at IS NULL)
    GROUP BY st.id
  ) p
  LEFT JOIN public.class_fees cf
    ON cf.school_id = s.school_id
    AND cf.class_name = s.class_name
  WHERE s.id = p.student_id;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;
  RAISE NOTICE 'Backfill complete: updated % students with correct paid_fee and remaining_fee', v_updated_count;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during backfill: %', SQLERRM;
  RAISE;
END $$;

-- 3. VERIFY: Check for remaining mismatches
DO $$
DECLARE
  v_mismatched_count INT;
  v_negative_remaining INT;
BEGIN
  SELECT COUNT(*)
  INTO v_mismatched_count
  FROM public.students s
  WHERE COALESCE(s.paid_fee, 0) !=
        (SELECT COALESCE(SUM(amount), 0) FROM public.payments p WHERE p.student_id = s.id AND p.deleted_at IS NULL);

  SELECT COUNT(*)
  INTO v_negative_remaining
  FROM public.students
  WHERE remaining_fee < 0;

  IF v_mismatched_count > 0 OR v_negative_remaining > 0 THEN
    RAISE WARNING 'After fix: % students have mismatched paid_fee, % have negative remaining_fee', v_mismatched_count, v_negative_remaining;
  ELSE
    RAISE NOTICE 'All student balances verified correct: no mismatches, no negative remaining_fee';
  END IF;
END $$;
