DO $$
BEGIN
  IF to_regclass('public.payments') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_payments_school_student_created_at ON public.payments(school_id, student_id, created_at DESC)';
  END IF;

  IF to_regclass('public.salaries') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_salaries_school_created_at ON public.salaries(school_id, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_salaries_school_teacher_month ON public.salaries(school_id, teacher_id, month)';
  END IF;

  IF to_regclass('public.deductions') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_deductions_school_date_teacher ON public.deductions(school_id, deduction_date DESC, teacher_id)';
  END IF;

  IF to_regclass('public.lecture_prices') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lecture_prices_school_grade ON public.lecture_prices(school_id, grade)';
  END IF;

  IF to_regclass('public.lesson_times') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_lesson_times_school_session_period ON public.lesson_times(school_id, session_type, period)';
  END IF;
END $$;
