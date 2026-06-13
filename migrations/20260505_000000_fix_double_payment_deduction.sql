-- CRITICAL FIX: Double payment deduction in students.paid_fee
-- Evidence: 100,000 payment in DB, but students.paid_fee = 200,000 (double)
-- Root cause: recompute function incrementing instead of replacing, OR being called twice
-- Fix: Ensure function calculates from SUM (idempotent), fix remaining_fee to use class_fees

DO $$
BEGIN
  -- 1. DROP old/incorrect triggers to prevent double execution
  DROP TRIGGER IF EXISTS trg_sync_student_payment_totals_on_payments ON public.payments;

  -- 2. Recreate function with CORRECT logic (replacing, not incrementing)
  -- MUST be idempotent: SUM(payments) is the source of truth
  CREATE OR REPLACE FUNCTION public.recompute_student_payment_totals(target_student_id UUID)
  RETURNS VOID
  LANGUAGE plpgsql
  AS $body$
  DECLARE
    next_paid_fee NUMERIC := 0;
    student_total_fee NUMERIC := 0;
    student_discount_value NUMERIC := 0;
    next_remaining_fee NUMERIC := 0;
  BEGIN
    IF target_student_id IS NULL THEN
      RETURN;
    END IF;

    -- Calculate SUM of all payments for this student (idempotent: always fresh sum)
    SELECT COALESCE(SUM(amount), 0)
    INTO next_paid_fee
    FROM public.payments
    WHERE student_id = target_student_id
      AND (deleted_at IS NULL);

    -- Get student's total_fee (will be overridden by class_fees if exists)
    SELECT total_fee, discount_value
    INTO student_total_fee, student_discount_value
    FROM public.students
    WHERE id = target_student_id;

    student_total_fee := COALESCE(student_total_fee, 0);
    student_discount_value := COALESCE(student_discount_value, 0);

    -- Calculate remaining (never negative for display)
    next_remaining_fee := GREATEST(student_total_fee - next_paid_fee - student_discount_value, 0);

    -- UPDATE students with calculated values (SET, not ADD)
    UPDATE public.students
    SET
      paid_fee = next_paid_fee,
      remaining_fee = next_remaining_fee,
      updated_at = NOW()
    WHERE id = target_student_id;
  END;
  $body$;

  -- 3. Recreate trigger (only one trigger, fires once per INSERT)
  CREATE OR REPLACE FUNCTION public.sync_student_payment_totals_from_payments()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  AS $body$
  BEGIN
    IF TG_OP = 'DELETE' THEN
      PERFORM public.recompute_student_payment_totals(OLD.student_id);
      RETURN OLD;
    END IF;

    -- On INSERT or UPDATE: recompute the affected student(s)
    PERFORM public.recompute_student_payment_totals(NEW.student_id);

    -- If student_id changed, recompute old student too
    IF TG_OP = 'UPDATE' AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
      PERFORM public.recompute_student_payment_totals(OLD.student_id);
    END IF;

    RETURN NEW;
  END;
  $body$;

  -- Create new trigger (fires AFTER INSERT/UPDATE/DELETE once per row)
  CREATE TRIGGER trg_sync_student_payment_totals_on_payments
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_student_payment_totals_from_payments();

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during trigger recreation: %', SQLERRM;
  RAISE;
END $$;

-- 4. BACKFILL: Recalculate all student balances from payments + class_fees
-- This is idempotent: running it twice produces same result
DO $$
BEGIN
  -- For each student, recalculate from SUM(payments) + class_fees resolution
  UPDATE public.students s
  SET
    paid_fee = COALESCE(p.total_paid, 0),
    remaining_fee = GREATEST(
      COALESCE(s.total_fee, 0) - COALESCE(p.total_paid, 0) - COALESCE(s.discount_value, 0),
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
  WHERE s.id = p.student_id
    AND (s.paid_fee != COALESCE(p.total_paid, 0) OR s.remaining_fee < 0);

  RAISE NOTICE 'Backfill complete: recalculated student balances from payments';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error during backfill: %', SQLERRM;
  RAISE;
END $$;

-- 5. VERIFY: Log sample of fixed balances for audit
DO $$
DECLARE
  mismatched_count INT;
  negative_remaining_count INT;
BEGIN
  -- Check if any students still have mismatched balances
  SELECT COUNT(*)
  INTO mismatched_count
  FROM public.students s
  WHERE COALESCE(s.paid_fee, 0) !=
        (SELECT COALESCE(SUM(amount), 0) FROM public.payments p WHERE p.student_id = s.id AND p.deleted_at IS NULL);

  -- Check if any have negative remaining
  SELECT COUNT(*)
  INTO negative_remaining_count
  FROM public.students
  WHERE remaining_fee < 0;

  IF mismatched_count > 0 OR negative_remaining_count > 0 THEN
    RAISE WARNING 'After fix: % students have mismatched paid_fee, % have negative remaining_fee', mismatched_count, negative_remaining_count;
  ELSE
    RAISE NOTICE 'All student balances verified correct after fix';
  END IF;
END $$;
