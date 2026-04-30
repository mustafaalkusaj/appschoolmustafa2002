-- Fix: Remove restrictive constraint on remaining_fee column
-- This constraint was blocking all UPDATE operations on students table

DO $$
BEGIN
  -- Step 1: Check if remaining_fee column exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'students' AND column_name = 'remaining_fee'
  ) THEN

    -- Step 2: Drop any CHECK constraints on remaining_fee that prevent updates
    DECLARE
      constraint_record RECORD;
    BEGIN
      FOR constraint_record IN
        SELECT constraint_name
        FROM information_schema.check_constraints
        WHERE table_name = 'students'
          AND constraint_name LIKE '%remaining%'
      LOOP
        EXECUTE 'ALTER TABLE public.students DROP CONSTRAINT ' || constraint_record.constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_record.constraint_name;
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'No CHECK constraints to drop or error dropping: %', SQLERRM;
    END;

    -- Step 3: Ensure remaining_fee is a proper GENERATED column
    -- Check if it's currently a regular column and fix it
    DECLARE
      col_is_generated boolean;
      col_definition text;
    BEGIN
      SELECT is_generated, generation_expression
      INTO col_is_generated, col_definition
      FROM information_schema.columns
      WHERE table_name = 'students' AND column_name = 'remaining_fee';

      IF col_is_generated = 'NEVER' THEN
        -- It's a regular column, convert it to GENERATED
        -- First, we need to drop it and recreate it
        ALTER TABLE public.students
        ADD COLUMN remaining_fee_new numeric
        GENERATED ALWAYS AS (
          GREATEST(
            COALESCE(total_fee, 0) - COALESCE(paid_fee, 0),
            0
          )
        ) STORED;

        -- Copy data (though it should be computed)
        UPDATE public.students
        SET remaining_fee_new = remaining_fee
        WHERE remaining_fee IS NOT NULL;

        -- Drop old column
        ALTER TABLE public.students
        DROP COLUMN remaining_fee;

        -- Rename new column
        ALTER TABLE public.students
        RENAME COLUMN remaining_fee_new TO remaining_fee;

        RAISE NOTICE 'Converted remaining_fee to GENERATED ALWAYS column';
      ELSIF col_is_generated = 'ALWAYS' THEN
        RAISE NOTICE 'remaining_fee is already a GENERATED ALWAYS column';
      END IF;
    END;
  ELSE
    RAISE NOTICE 'remaining_fee column does not exist on students table';
  END IF;
END
$$;

-- Verify the fix works
-- Test: UPDATE students with status change should work
-- SELECT COUNT(*) FROM students WHERE remaining_fee IS NOT NULL AND id IS NOT NULL LIMIT 1;
