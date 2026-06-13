-- ============================================================
-- DEEP DATABASE AUDIT: remaining_fee Write Blocker
-- Run in Supabase SQL Editor to identify root cause
-- ============================================================

-- ============================================================
-- PHASE 1: COLUMN DEFINITION
-- ============================================================
\echo '=== PHASE 1: Column Definition ==='

-- Show exact column definition
SELECT
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_identity,
  is_generated,
  generation_expression,
  is_updatable
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name = 'remaining_fee';

-- Show raw column info
SELECT
  column_name,
  data_type,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('remaining_fee', 'total_fee', 'paid_fee', 'discount_value');

-- ============================================================
-- PHASE 2: CONSTRAINTS ON STUDENTS TABLE
-- ============================================================
\echo '=== PHASE 2: CHECK Constraints ==='

SELECT
  constraint_name,
  constraint_definition,
  is_deferrable,
  initially_deferred
FROM information_schema.check_constraints
WHERE table_name = 'students'
ORDER BY constraint_name;

-- Find constraints mentioning remaining_fee
SELECT
  constraint_name,
  constraint_definition
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_name = 'students'
  AND cc.constraint_definition ILIKE '%remaining%';

-- ============================================================
-- PHASE 3: TRIGGERS ON STUDENTS
-- ============================================================
\echo '=== PHASE 3: Triggers on students table ==='

SELECT
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_timing,
  action_reference_old_table,
  action_reference_new_table,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'students'
ORDER BY trigger_name;

-- Get full trigger definition
SELECT
  trigger_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.students'::regclass
ORDER BY trigger_name;

-- ============================================================
-- PHASE 4: TRIGGERS ON PAYMENTS (might update students)
-- ============================================================
\echo '=== PHASE 4: Triggers on payments table ==='

SELECT
  trigger_name,
  event_object_schema,
  event_object_table,
  event_manipulation,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments'
ORDER BY trigger_name;

SELECT
  trigger_name,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.payments'::regclass
ORDER BY trigger_name;

-- ============================================================
-- PHASE 5: FUNCTIONS THAT TOUCH remaining_fee
-- ============================================================
\echo '=== PHASE 5: Functions mentioning remaining_fee ==='

SELECT
  routine_schema,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%remaining_fee%'
ORDER BY routine_name;

-- Functions that UPDATE students
\echo '=== PHASE 5b: Functions that UPDATE students ==='

SELECT
  routine_schema,
  routine_name,
  routine_type,
  routine_definition
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%UPDATE%students%'
ORDER BY routine_name;

-- ============================================================
-- PHASE 6: PROBLEMATIC PATTERNS
-- ============================================================
\echo '=== PHASE 6: Detecting problematic patterns ==='

-- Check if remaining_fee has a DEFAULT value (shouldn't if GENERATED)
SELECT
  column_name,
  column_default,
  is_generated
FROM information_schema.columns
WHERE table_name = 'students'
  AND (column_name = 'remaining_fee' OR column_default IS NOT NULL);

-- Check for columns with both DEFAULT and GENERATED (impossible, likely error)
SELECT
  column_name,
  data_type,
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_default IS NOT NULL
  AND is_generated = 'ALWAYS';

-- ============================================================
-- PHASE 7: TEST - Try to UPDATE and see exact error
-- ============================================================
\echo '=== PHASE 7: Test UPDATE ==='

-- Find a test student
SELECT id, status, total_fee, paid_fee, remaining_fee
FROM public.students
LIMIT 1;

-- Try UPDATE (will fail with the error, showing which operation blocks)
UPDATE public.students
SET status = 'active'
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status, total_fee, paid_fee, remaining_fee;

-- If failed, try with just status
UPDATE public.students
SET status = status
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status;

-- ============================================================
-- PHASE 8: SUMMARY REPORT
-- ============================================================
\echo '=== PHASE 8: Summary ==='

-- Column type
SELECT 'remaining_fee definition' as check_type,
  CASE
    WHEN is_generated = 'ALWAYS' THEN '✓ GENERATED ALWAYS (correct)'
    WHEN is_generated = 'BY DEFAULT' THEN '⚠ GENERATED BY DEFAULT (risky)'
    WHEN is_generated = 'NEVER' THEN '✗ Regular column (needs fix)'
    ELSE '? Unknown: ' || is_generated
  END as status
FROM information_schema.columns
WHERE table_name = 'students' AND column_name = 'remaining_fee';

-- Constraints blocking updates
SELECT 'CHECK constraints' as check_type,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ None found (good)'
    ELSE '✗ Found ' || COUNT(*)::text || ' constraints (may block)'
  END as status
FROM information_schema.check_constraints
WHERE table_name = 'students';

-- Triggers
SELECT 'Triggers on students' as check_type,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ None found (good)'
    ELSE '✗ Found ' || COUNT(*)::text || ' triggers (may write remaining_fee)'
  END as status
FROM information_schema.triggers
WHERE event_object_table = 'students';

-- Functions writing to remaining_fee
SELECT 'Functions updating students' as check_type,
  CASE
    WHEN COUNT(*) = 0 THEN '✓ None found (good)'
    ELSE '✗ Found ' || COUNT(*)::text || ' functions'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%UPDATE%students%'
  AND routine_definition ILIKE '%remaining%';

\echo '=== End of audit ==='
