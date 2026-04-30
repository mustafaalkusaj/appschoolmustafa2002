-- Add school_id foreign key to branches table
-- This is required for filtering branches by school and for proper data relationships

-- Step 1: Add the column
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS school_id uuid REFERENCES public.schools(id) ON DELETE CASCADE;

-- Step 2: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_branches_school_id
  ON public.branches(school_id);

-- Step 3: For now, data population requires understanding the actual schools <-> school_groups relationship
-- If schools and school_groups are the same thing (school.id == school_groups.id), then:
-- UPDATE branches SET school_id = group_id WHERE group_id IS NOT NULL;
-- This should be done manually after verifying the relationship in production.
