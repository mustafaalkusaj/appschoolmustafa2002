DO $$
BEGIN
  IF to_regclass('public.expenses') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_school_expense_date_created_at ON public.expenses(school_id, expense_date DESC, created_at DESC)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expenses_school_type_expense_date ON public.expenses(school_id, expense_type_id, expense_date DESC)';
  END IF;

  IF to_regclass('public.expense_types') IS NOT NULL THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expense_types_school_name ON public.expense_types(school_id, name)';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_expense_types_school_lower_name ON public.expense_types(school_id, lower(name))';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.school_expenses_summary(
  p_school_id UUID,
  p_search TEXT DEFAULT '',
  p_expense_type_id UUID DEFAULT NULL,
  p_from_date DATE DEFAULT NULL,
  p_to_date DATE DEFAULT NULL
)
RETURNS TABLE (
  school_total_count BIGINT,
  school_total_amount NUMERIC,
  school_today_amount NUMERIC,
  filtered_total_count BIGINT,
  filtered_total_amount NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  WITH school_scope AS (
    SELECT
      id,
      amount,
      expense_date,
      expense_type_id,
      recipient,
      receipt_number,
      notes
    FROM public.expenses
    WHERE school_id = p_school_id
  ),
  filtered_scope AS (
    SELECT *
    FROM school_scope
    WHERE (p_expense_type_id IS NULL OR expense_type_id = p_expense_type_id)
      AND (p_from_date IS NULL OR expense_date >= p_from_date)
      AND (p_to_date IS NULL OR expense_date <= p_to_date)
      AND (
        COALESCE(NULLIF(TRIM(p_search), ''), '') = ''
        OR COALESCE(recipient, '') ILIKE '%' || TRIM(p_search) || '%'
        OR COALESCE(receipt_number, '') ILIKE '%' || TRIM(p_search) || '%'
        OR COALESCE(notes, '') ILIKE '%' || TRIM(p_search) || '%'
      )
  )
  SELECT
    (SELECT COUNT(*)::BIGINT FROM school_scope) AS school_total_count,
    (SELECT COALESCE(SUM(amount), 0) FROM school_scope) AS school_total_amount,
    (SELECT COALESCE(SUM(amount), 0) FROM school_scope WHERE expense_date = CURRENT_DATE) AS school_today_amount,
    (SELECT COUNT(*)::BIGINT FROM filtered_scope) AS filtered_total_count,
    (SELECT COALESCE(SUM(amount), 0) FROM filtered_scope) AS filtered_total_amount;
$$;

GRANT EXECUTE ON FUNCTION public.school_expenses_summary(UUID, TEXT, UUID, DATE, DATE)
TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.school_expense_types_overview(
  p_school_id UUID,
  p_search TEXT DEFAULT ''
)
RETURNS TABLE (
  id UUID,
  school_id UUID,
  name TEXT,
  notes TEXT,
  usage_count BIGINT,
  usage_total NUMERIC
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    et.id,
    et.school_id,
    et.name,
    et.notes,
    COUNT(e.id)::BIGINT AS usage_count,
    COALESCE(SUM(e.amount), 0) AS usage_total
  FROM public.expense_types AS et
  LEFT JOIN public.expenses AS e
    ON e.expense_type_id = et.id
   AND e.school_id = et.school_id
  WHERE et.school_id = p_school_id
    AND (
      COALESCE(NULLIF(TRIM(p_search), ''), '') = ''
      OR COALESCE(et.name, '') ILIKE '%' || TRIM(p_search) || '%'
    )
  GROUP BY et.id, et.school_id, et.name, et.notes
  ORDER BY et.name ASC;
$$;

GRANT EXECUTE ON FUNCTION public.school_expense_types_overview(UUID, TEXT)
TO authenticated, service_role;
