ALTER TABLE IF EXISTS public.branches
  ADD COLUMN IF NOT EXISTS primary_color TEXT NULL,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT NULL,
  ADD COLUMN IF NOT EXISTS sidebar_color TEXT NULL,
  ADD COLUMN IF NOT EXISTS accent_color TEXT NULL,
  ADD COLUMN IF NOT EXISTS text_color TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_branches_school_active_created_at
  ON public.branches(school_id, is_active, created_at DESC);
