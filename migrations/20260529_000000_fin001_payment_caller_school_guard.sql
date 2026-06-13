-- ============================================================================
-- FIN-001 FIX — caller-school guard inside create_payment_atomic
-- ============================================================================
-- المشكلة: create_payment_atomic (SECURITY DEFINER, ممنوحة لـ authenticated) لا
-- تتحقق أن المستدعي يخص p_school_id. أي مستخدم موثّق (بما فيهم طالب/ولي عبر Supabase
-- مباشرة) يستطيع استدعاءها عبر REST RPC وإنشاء دفعة في أي مدرسة لأي طالب، متجاوزاً
-- كل فحوص طبقة API (add_payments / branch scope / rate-limit).
--
-- لماذا لا نلجأ لـ REVOKE: مسار الويب يستدعي الدالة عبر العميل المصادَق
-- (createRouteSupabaseClient = anon key + كوكي المستخدم = دور authenticated)، لذا
-- REVOKE EXECUTE من authenticated سيكسر تسجيل الدفعات. الإصلاح الصحيح هو فحص
-- مدرسة المستدعي داخل الدالة.
--
-- ⚠️ غير مُطبّق على الإنتاج (قاعدة #2). يجب اختباره على بيئة Supabase آمنة (Run B)
--    والتأكد من تدفّق super_admin عبر المدارس قبل النشر.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.create_payment_atomic(
  p_school_id uuid, p_student_id uuid, p_branch_id uuid, p_amount numeric,
  p_payment_method text, p_notes text, p_created_at timestamp with time zone,
  p_receipt_number text, p_manual_receipt_number text
)
RETURNS TABLE(id uuid, school_id uuid, branch_id uuid, student_id uuid, amount numeric,
  payment_method text, notes text, created_at timestamp with time zone, receipt_number text,
  manual_receipt_number text, paid_fee_after numeric, remaining_fee_after numeric, error_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  -- ── FIN-001 GUARD: caller must belong to p_school_id (super_admin & service-role exempt) ──
  IF auth.uid() IS NOT NULL
     AND COALESCE(current_app_role(), '') <> 'super_admin'
     AND p_school_id IS DISTINCT FROM current_school_id() THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      NULL::TEXT, NULL::TEXT,
      NULL::NUMERIC, NULL::NUMERIC,
      'SCHOOL_FORBIDDEN'::TEXT;
    RETURN;
  END IF;

  -- Lock student row
  SELECT s.id, s.school_id, s.branch_id, s.total_fee, s.discount_value, s.class_name, s.status
    INTO v_student
    FROM students s
   WHERE s.id = p_student_id
     AND s.school_id = p_school_id
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

  IF COALESCE(v_student.status, 'active') <> 'active' THEN
    RETURN QUERY SELECT
      NULL::UUID, NULL::UUID, NULL::UUID, NULL::UUID,
      NULL::NUMERIC, NULL::TEXT, NULL::TEXT, NULL::TIMESTAMPTZ,
      NULL::TEXT, NULL::TEXT,
      NULL::NUMERIC, NULL::NUMERIC,
      ('STUDENT_STATUS_' || UPPER(COALESCE(v_student.status, 'unknown')))::TEXT;
    RETURN;
  END IF;

  IF v_student.class_name IS NOT NULL THEN
    SELECT cf.total_fee INTO v_class_fee
      FROM class_fees cf
     WHERE cf.school_id = p_school_id
       AND cf.class_name = v_student.class_name
     LIMIT 1;
  END IF;

  v_effective_total := COALESCE(v_class_fee, COALESCE(v_student.total_fee, 0));
  v_effective_disc  := COALESCE(v_student.discount_value, 0);

  SELECT COALESCE(SUM(pay.amount), 0) INTO v_sum_paid
    FROM payments pay
   WHERE pay.student_id = p_student_id
     AND pay.school_id  = p_school_id
     AND pay.deleted_at IS NULL;

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
    v_payment_id, p_school_id, p_branch_id, p_student_id, p_amount,
    p_payment_method, p_notes, v_created_at, p_receipt_number, p_manual_receipt_number,
    v_sum_paid + p_amount,
    GREATEST(v_effective_total - (v_sum_paid + p_amount) - v_effective_disc, 0),
    NULL::TEXT;
END;
$function$;
