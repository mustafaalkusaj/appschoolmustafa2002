DO $$
BEGIN
  IF to_regclass('public.students') IS NOT NULL AND to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.recompute_student_payment_totals(target_student_id UUID)
      RETURNS VOID
      LANGUAGE plpgsql
      AS $body$
      DECLARE
        next_paid_fee NUMERIC := 0;
      BEGIN
        IF target_student_id IS NULL THEN
          RETURN;
        END IF;

        SELECT COALESCE(SUM(amount), 0)
        INTO next_paid_fee
        FROM public.payments
        WHERE student_id = target_student_id;

        UPDATE public.students
        SET
          paid_fee = next_paid_fee
        WHERE id = target_student_id;
      END;
      $body$;
    $fn$;

    EXECUTE $fn$
      CREATE OR REPLACE FUNCTION public.sync_student_payment_totals_from_payments()
      RETURNS TRIGGER
      LANGUAGE plpgsql
      AS $body$
      BEGIN
        IF TG_OP = 'DELETE' THEN
          PERFORM public.recompute_student_payment_totals(OLD.student_id);
          RETURN OLD;
        END IF;

        PERFORM public.recompute_student_payment_totals(NEW.student_id);

        IF TG_OP = 'UPDATE' AND NEW.student_id IS DISTINCT FROM OLD.student_id THEN
          PERFORM public.recompute_student_payment_totals(OLD.student_id);
        END IF;

        RETURN NEW;
      END;
      $body$;
    $fn$;

    DROP TRIGGER IF EXISTS trg_sync_student_payment_totals_on_payments ON public.payments;
    CREATE TRIGGER trg_sync_student_payment_totals_on_payments
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_student_payment_totals_from_payments();

    UPDATE public.students AS s
    SET
      paid_fee = COALESCE(p.total_paid, 0)
    FROM (
      SELECT st.id AS student_id, COALESCE(SUM(pay.amount), 0) AS total_paid
      FROM public.students AS st
      LEFT JOIN public.payments AS pay ON pay.student_id = st.id
      GROUP BY st.id
    ) AS p
    WHERE s.id = p.student_id;
  END IF;

  IF to_regclass('public.salaries') IS NOT NULL THEN
    WITH ranked_salaries AS (
      SELECT
        id,
        ROW_NUMBER() OVER (
          PARTITION BY school_id, teacher_id, month
          ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS row_number
      FROM public.salaries
      WHERE school_id IS NOT NULL
        AND teacher_id IS NOT NULL
        AND month IS NOT NULL
    )
    DELETE FROM public.salaries AS s
    USING ranked_salaries AS ranked
    WHERE s.id = ranked.id
      AND ranked.row_number > 1;

    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_salaries_school_teacher_month_unique ON public.salaries(school_id, teacher_id, month)';
  END IF;
END $$;
