-- Add group_id column to schools table to establish the school -> group -> branches relationship
-- This fixes the issue where branch queries were returning empty results because
-- schools didn't have a way to reference school_groups, and branches only link via group_id

-- Step 1: Add the group_id column (nullable for now)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES public.school_groups(id) ON DELETE SET NULL;

-- Step 2: Create index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_schools_group_id
  ON public.schools(group_id);

-- Step 3: Ensure every school has a corresponding school_group
-- For each school, create a school_group with the same id if it doesn't exist
INSERT INTO public.school_groups (id, name, created_at)
SELECT s.id, COALESCE(s.name, 'School Group'), COALESCE(s.created_at, NOW())
FROM public.schools s
LEFT JOIN public.school_groups sg ON sg.id = s.id
WHERE sg.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 4: Link all schools to their corresponding school_group (one-to-one mapping)
UPDATE public.schools
SET group_id = id
WHERE group_id IS NULL;

-- Step 5: Ensure branches have school_id set where there's a corresponding school
-- This provides a fallback path for the overview query
UPDATE public.branches b
SET school_id = (
  SELECT s.id
  FROM public.schools s
  WHERE s.group_id = b.group_id
  LIMIT 1
)
WHERE b.school_id IS NULL AND b.group_id IS NOT NULL;

