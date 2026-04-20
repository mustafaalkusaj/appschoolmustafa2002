CREATE TABLE IF NOT EXISTS public.school_data_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NULL REFERENCES public.schools(id) ON DELETE SET NULL,
  school_name text NOT NULL,
  archive_source text NOT NULL CHECK (archive_source IN ('manual_export', 'soft_delete', 'hard_delete')),
  payload jsonb NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_school_data_archives_school_created_at
  ON public.school_data_archives(school_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_data_archives_created_at
  ON public.school_data_archives(created_at DESC);
