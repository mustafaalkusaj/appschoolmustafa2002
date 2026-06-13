-- Comprehensive Supabase SQL Fix for remaining_fee Column
-- Run this in Supabase SQL Editor to diagnose and fix the constraint issue
-- https://app.supabase.com/project/[your-project-id]/sql/new

-- ============================================================
-- PHASE 1: DIAGNOSIS
-- ============================================================

-- 1.1 Check remaining_fee column definition
SELECT
  column_name,
  data_type,
  is_generated,
  generation_expression,
  is_updatable,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'students'
  AND column_name IN ('remaining_fee', 'total_fee', 'paid_fee');

-- 1.2 Find all CHECK constraints on students table
SELECT constraint_name, constraint_definition
FROM information_schema.check_constraints
WHERE table_name = 'students'
ORDER BY constraint_name;

-- 1.3 List all TRIGGERS on students and payments tables
SELECT
  trigger_name,
  event_object_table,
  action_statement,
  action_timing,
  event_manipulation
FROM information_schema.triggers
WHERE event_object_table IN ('students', 'payments')
ORDER BY event_object_table, trigger_name;

-- 1.4 Find functions that modify remaining_fee
SELECT
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_definition ILIKE '%remaining_fee%'
ORDER BY routine_name;

-- ============================================================
-- PHASE 2: FIX - Execute one of these based on diagnosis
-- ============================================================

-- FIX OPTION A: If remaining_fee has a bad CHECK constraint
-- Drop the problematic constraint
ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS check_remaining_fee;

ALTER TABLE public.students
DROP CONSTRAINT IF EXISTS remaining_fee_check;

-- Try to find and drop any constraint with 'remaining' in name
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  FOR constraint_record IN
    SELECT constraint_name
    FROM information_schema.check_constraints
    WHERE table_name = 'students'
      AND constraint_name ILIKE '%remaining%'
  LOOP
    EXECUTE format('ALTER TABLE public.students DROP CONSTRAINT %I', constraint_record.constraint_name);
    RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
  END LOOP;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Error or no constraints to drop: %', SQLERRM;
END $$;

-- FIX OPTION B: If remaining_fee is not GENERATED correctly
-- Recreate it as a proper GENERATED ALWAYS column
DO $$
BEGIN
  -- Check if column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'remaining_fee'
  ) THEN
    -- Add temporary column
    ALTER TABLE public.students
    ADD COLUMN remaining_fee_new numeric
    GENERATED ALWAYS AS (
      GREATEST(
        COALESCE(total_fee, 0) - COALESCE(paid_fee, 0),
        0
      )
    ) STORED;

    -- Drop old column (if it's not generated)
    BEGIN
      ALTER TABLE public.students
      DROP COLUMN remaining_fee;

      -- Rename new column
      ALTER TABLE public.students
      RENAME COLUMN remaining_fee_new TO remaining_fee;

      RAISE NOTICE 'Successfully recreated remaining_fee as GENERATED ALWAYS column';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop old column (may already be correct): %', SQLERRM;
      -- Clean up if it fails
      ALTER TABLE public.students
      DROP COLUMN IF EXISTS remaining_fee_new;
    END;
  END IF;
END $$;

-- ============================================================
-- PHASE 3: VERIFY THE FIX
-- ============================================================

-- 3.1 Test UPDATE without touching remaining_fee
UPDATE public.students
SET status = 'active'
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status, total_fee, paid_fee, remaining_fee;

-- 3.2 Test UPDATE with multiple fields
UPDATE public.students
SET
  class_name = class_name,
  section = section,
  status = status
WHERE id = (SELECT id FROM public.students LIMIT 1)
RETURNING id, status, remaining_fee;

-- 3.3 Check remaining_fee is calculated correctly
SELECT
  id,
  total_fee,
  paid_fee,
  discount_value,
  remaining_fee,
  (total_fee - paid_fee) AS calculated_remaining
FROM public.students
LIMIT 5;

-- ============================================================
-- PHASE 4: CREATE INDEX ON remaining_fee FOR QUERIES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_students_remaining_fee
ON public.students(school_id, remaining_fee);

-- ============================================================
-- SUCCESS INDICATORS
-- ============================================================
-- If you see:
-- ✓ remaining_fee is GENERATED ALWAYS
-- ✓ UPDATE returned 1 row (Phase 3.1)
-- ✓ No error messages about "can only be updated to DEFAULT"
-- Then the fix is successful!
--
-- Your student status update API should now work:
-- PATCH /api/web/students/[id]
-- {"school_id": "xxx", "status": "suspended"}
