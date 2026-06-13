-- Verify remaining_fee column configuration in Supabase
-- Run this in Supabase SQL Editor to confirm state
-- https://app.supabase.com/project/[project-id]/sql/new

-- ============================================================
-- CHECK 1: Column Definition
-- ============================================================
-- Should show: is_generated = ALWAYS, is_updatable = NO
SELECT
  column_name,
  data_type,
  is_generated,
  generation_expression,
  is_updatable,
  column_default
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name = 'remaining_fee';

-- Expected: GENERATED ALWAYS, is_updatable = NO (read-only)

-- ============================================================
-- CHECK 2: No CHECK Constraints Blocking Updates
-- ============================================================
-- Should return: (empty result or unrelated constraints)
SELECT
  constraint_name,
  constraint_definition
FROM information_schema.check_constraints
WHERE table_name = 'students'
ORDER BY constraint_name;

-- Expected: No constraints with "remaining" or blocking updates

-- ============================================================
-- CHECK 3: No Triggers Writing to remaining_fee
-- ============================================================
-- Should return: (empty result)
SELECT
  trigger_name,
  action_statement
FROM information_schema.triggers
WHERE event_object_table IN ('students', 'payments')
  AND action_statement ILIKE '%remaining_fee%'
ORDER BY trigger_name;

-- Expected: Empty (no triggers touch remaining_fee)

-- ============================================================
-- CHECK 4: Functions Only Read remaining_fee (Not Write)
-- ============================================================
-- Count SELECT vs UPDATE on remaining_fee
SELECT
  routine_name,
  routine_type,
  CASE
    WHEN routine_definition ILIKE '%SET%remaining_fee%' THEN 'WRITES TO IT (BAD)'
    WHEN routine_definition ILIKE '%remaining_fee%' THEN 'READS IT (OK)'
    ELSE 'UNCLEAR'
  END AS operation
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%remaining_fee%'
ORDER BY routine_name;

-- Expected: All READS IT (OK), none WRITES TO IT

-- ============================================================
-- CHECK 5: Test UPDATE (Should Work)
-- ============================================================
-- This should succeed and return 1 row
UPDATE public.students
SET status = 'active'
WHERE id = (SELECT id FROM public.students WHERE status IS NOT NULL LIMIT 1)
RETURNING id, status, total_fee, paid_fee, remaining_fee;

-- If error: "can only be updated to DEFAULT"
--   → Column is GENERATED but something is trying to force-write it
--   → Check triggers and functions above (CHECK 3 & 4)
--
-- If success: ✓ Everything is correct

-- ============================================================
-- SUMMARY
-- ============================================================
-- If you see:
--   ✓ is_generated = ALWAYS
--   ✓ is_updatable = NO
--   ✓ No constraints found
--   ✓ No triggers with remaining_fee
--   ✓ Functions only READ
--   ✓ Test UPDATE succeeded
--
-- Then remaining_fee is configured correctly.
--
-- If Test UPDATE fails with "can only be updated to DEFAULT":
--   Check CHECK 2 & 3 for problematic constraints/triggers
--   and remove them with:
--     ALTER TABLE public.students DROP CONSTRAINT [name];
--     DROP TRIGGER [name] ON [table];
