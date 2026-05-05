-- Audit Query: Find students with paid_fee > total_fee (likely due to overpayment bug)
-- This is a read-only query to identify data inconsistencies

SELECT
  s.id,
  s.full_name,
  s.school_id,
  s.branch_id,
  b.name_ar AS branch_name,
  COALESCE(cf.total_fee, s.total_fee, 0) AS effective_total_fee,
  s.paid_fee,
  s.discount_value,
  (COALESCE(cf.total_fee, s.total_fee, 0) - s.paid_fee - COALESCE(s.discount_value, 0)) AS calculated_remaining,
  s.created_at,
  s.updated_at,
  COUNT(p.id) AS payment_count,
  COALESCE(SUM(p.amount), 0) AS sum_of_payments
FROM students s
LEFT JOIN branches b ON b.id = s.branch_id
LEFT JOIN class_fees cf ON cf.school_id = s.school_id AND cf.class_name = s.class_name
LEFT JOIN payments p ON p.student_id = s.id
WHERE COALESCE(s.paid_fee, 0) > COALESCE(cf.total_fee, s.total_fee, 0)
GROUP BY s.id, s.full_name, s.school_id, s.branch_id, b.name_ar, cf.total_fee, s.total_fee, s.discount_value, s.created_at, s.updated_at
ORDER BY s.updated_at DESC NULLS LAST;
