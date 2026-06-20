-- CRITICAL FIX: recompute_student_payment_totals referenced non-existent columns
-- (students.class_id, class_fees.class_id, class_fees.deleted_at) and cast the uuid
-- id to TEXT. The trg_sync_student_payment_totals_on_payments trigger calls it on
-- every payments INSERT/UPDATE/DELETE, so every payment write threw
-- "column class_id does not exist" and aborted with a 500. No payment was recordable.
-- Rewritten against the real schema: class_name (text), uuid ids, no deleted_at on class_fees.
CREATE OR REPLACE FUNCTION public.recompute_student_payment_totals(target_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_paid_fee    NUMERIC := 0;
  effective_total  NUMERIC := 0;
  v_school_id      uuid;
  v_class_name     text;
BEGIN
  IF target_student_id IS NULL THEN RETURN; END IF;

  SELECT COALESCE(SUM(amount), 0) INTO next_paid_fee
  FROM public.payments
  WHERE student_id = target_student_id AND deleted_at IS NULL;

  SELECT school_id, class_name INTO v_school_id, v_class_name
  FROM public.students
  WHERE id = target_student_id;

  SELECT COALESCE(
    (SELECT cf.total_fee FROM public.class_fees cf
     WHERE cf.class_name = v_class_name AND cf.school_id = v_school_id
     LIMIT 1),
    (SELECT s.total_fee FROM public.students s WHERE s.id = target_student_id)
  ) INTO effective_total;

  UPDATE public.students
  SET paid_fee  = ROUND(next_paid_fee),
      total_fee = COALESCE(ROUND(effective_total), total_fee)
  WHERE id = target_student_id;
END;
$$;
