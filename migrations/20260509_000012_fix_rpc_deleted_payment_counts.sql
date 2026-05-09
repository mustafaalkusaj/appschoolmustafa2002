CREATE OR REPLACE FUNCTION public.school_payments_summary(p_school_id uuid)
RETURNS TABLE (
  total_students bigint,
  total_fee numeric,
  total_paid numeric,
  total_remaining numeric,
  collected_count bigint,
  total_payment_count bigint,
  payment_years integer[]
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH student_summary AS (
    SELECT
      count(*) FILTER (WHERE coalesce(status, 'active') <> 'deleted')::bigint AS total_students,
      coalesce(sum(total_fee) FILTER (WHERE coalesce(status, 'active') <> 'deleted'), 0)::numeric AS total_fee,
      coalesce(sum(paid_fee) FILTER (WHERE coalesce(status, 'active') <> 'deleted'), 0)::numeric AS total_paid,
      coalesce(sum(remaining_fee) FILTER (WHERE coalesce(status, 'active') <> 'deleted'), 0)::numeric AS total_remaining,
      count(*) FILTER (
        WHERE coalesce(status, 'active') <> 'deleted'
          AND coalesce(remaining_fee, 0) <= 0
          AND coalesce(total_fee, 0) > 0
      )::bigint AS collected_count
    FROM public.students
    WHERE school_id = p_school_id
  ),
  payment_summary AS (
    SELECT
      (SELECT count(*)::bigint FROM public.payments WHERE school_id = p_school_id AND deleted_at IS NULL) AS total_payment_count,
      coalesce(
        (
          SELECT array_agg(payment_year ORDER BY payment_year DESC)
          FROM (
            SELECT DISTINCT extract(year FROM created_at)::integer AS payment_year
            FROM public.payments
            WHERE school_id = p_school_id
              AND deleted_at IS NULL
              AND created_at IS NOT NULL
          ) AS years
        ),
        '{}'::integer[]
      ) AS payment_years
  )
  SELECT
    student_summary.total_students,
    student_summary.total_fee,
    student_summary.total_paid,
    student_summary.total_remaining,
    student_summary.collected_count,
    payment_summary.total_payment_count,
    payment_summary.payment_years
  FROM student_summary, payment_summary;
$$;

GRANT EXECUTE ON FUNCTION public.school_payments_summary(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.school_payment_students_page(
  p_school_id uuid,
  p_search text DEFAULT '',
  p_class_name text DEFAULT '',
  p_quick_filter text DEFAULT 'all',
  p_sort text DEFAULT 'name',
  p_dir text DEFAULT 'asc',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 25
)
RETURNS TABLE (
  id uuid,
  school_id uuid,
  full_name text,
  class_name text,
  section text,
  phone text,
  address text,
  total_fee numeric,
  paid_fee numeric,
  discount_value numeric,
  remaining_fee numeric,
  status text,
  payment_count bigint,
  total_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH params AS (
    SELECT
      greatest(coalesce(p_page, 1), 1) AS page,
      greatest(least(coalesce(p_page_size, 25), 100), 1) AS page_size,
      trim(regexp_replace(coalesce(p_search, ''), '[%_,()]', ' ', 'g')) AS normalized_search,
      trim(coalesce(p_class_name, '')) AS selected_class_name,
      coalesce(nullif(trim(p_quick_filter), ''), 'all') AS quick_filter,
      CASE WHEN p_sort IN ('remaining', 'total') THEN p_sort ELSE 'name' END AS sort_key,
      CASE WHEN lower(coalesce(p_dir, '')) = 'desc' THEN 'desc' ELSE 'asc' END AS sort_dir
  ),
  payment_counts AS (
    SELECT student_id, count(*)::bigint AS payment_count
    FROM public.payments
    WHERE school_id = p_school_id
      AND deleted_at IS NULL
    GROUP BY student_id
  ),
  filtered AS (
    SELECT
      s.id,
      s.school_id,
      s.full_name,
      s.class_name,
      s.section,
      s.phone,
      s.address,
      coalesce(s.total_fee, 0)::numeric AS total_fee,
      coalesce(s.paid_fee, 0)::numeric AS paid_fee,
      coalesce(s.discount_value, 0)::numeric AS discount_value,
      coalesce(s.remaining_fee, 0)::numeric AS remaining_fee,
      s.status,
      coalesce(pc.payment_count, 0)::bigint AS payment_count
    FROM public.students s
    LEFT JOIN payment_counts pc ON pc.student_id = s.id
    CROSS JOIN params p
    WHERE s.school_id = p_school_id
      AND (
        (p.quick_filter = 'transferred' AND s.status = 'transferred')
        OR (p.quick_filter = 'deleted' AND s.status = 'deleted')
        OR (p.quick_filter = 'suspended' AND s.status = 'suspended')
        OR (p.quick_filter = 'graduated' AND s.status = 'graduated')
        OR (p.quick_filter = 'discounted' AND coalesce(s.discount_value, 0) > 0)
        OR (p.quick_filter = 'collected' AND coalesce(s.remaining_fee, 0) <= 0 AND coalesce(s.total_fee, 0) > 0)
        OR ((p.quick_filter = 'all' OR p.quick_filter = 'no_invoice') AND coalesce(s.status, 'active') <> 'deleted')
      )
      AND (p.selected_class_name = '' OR coalesce(s.class_name, '') = p.selected_class_name)
      AND (
        p.normalized_search = ''
        OR coalesce(s.full_name, '') ILIKE '%' || p.normalized_search || '%'
        OR coalesce(s.class_name, '') ILIKE '%' || p.normalized_search || '%'
      )
      AND (p.quick_filter <> 'no_invoice' OR coalesce(pc.payment_count, 0) = 0)
  ),
  counted AS (
    SELECT filtered.*, count(*) OVER ()::bigint AS total_count
    FROM filtered
  ),
  ordered AS (
    SELECT counted.*
    FROM counted
    CROSS JOIN params p
    ORDER BY
      CASE WHEN p.sort_key = 'remaining' AND p.sort_dir = 'asc' THEN counted.remaining_fee END ASC NULLS LAST,
      CASE WHEN p.sort_key = 'remaining' AND p.sort_dir = 'desc' THEN counted.remaining_fee END DESC NULLS LAST,
      CASE WHEN p.sort_key = 'total' AND p.sort_dir = 'asc' THEN counted.total_fee END ASC NULLS LAST,
      CASE WHEN p.sort_key = 'total' AND p.sort_dir = 'desc' THEN counted.total_fee END DESC NULLS LAST,
      CASE WHEN p.sort_key = 'name' AND p.sort_dir = 'asc' THEN counted.full_name END ASC NULLS LAST,
      CASE WHEN p.sort_key = 'name' AND p.sort_dir = 'desc' THEN counted.full_name END DESC NULLS LAST,
      counted.full_name ASC,
      counted.id ASC
    LIMIT (SELECT page_size FROM params)
    OFFSET (((SELECT page FROM params) - 1) * (SELECT page_size FROM params))
  )
  SELECT
    ordered.id,
    ordered.school_id,
    ordered.full_name,
    ordered.class_name,
    ordered.section,
    ordered.phone,
    ordered.address,
    ordered.total_fee,
    ordered.paid_fee,
    ordered.discount_value,
    ordered.remaining_fee,
    ordered.status,
    ordered.payment_count,
    ordered.total_count
  FROM ordered;
$$;

GRANT EXECUTE ON FUNCTION public.school_payment_students_page(uuid, text, text, text, text, text, integer, integer) TO authenticated, service_role;
