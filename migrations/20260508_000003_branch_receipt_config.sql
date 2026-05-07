-- Per-branch receipt config. Same columns as school_receipt_config.
-- When printing a receipt, branch config is checked first; school config is the fallback.

CREATE TABLE IF NOT EXISTS public.branch_receipt_config (
  branch_id               UUID PRIMARY KEY REFERENCES public.branches(id) ON DELETE CASCADE,
  decoration_top_left     TEXT,
  decoration_top_right    TEXT,
  decoration_bottom_left  TEXT,
  decoration_bottom_right TEXT,
  background_pattern_url  TEXT,
  emblem_url              TEXT,
  thank_you_text          TEXT,
  footer_note             TEXT,
  primary_color           TEXT,
  accent_color            TEXT,
  page_size               TEXT NOT NULL DEFAULT 'A5'
                          CHECK (page_size IN ('A5', 'A4')),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_branch_receipt_config_updated_at
  ON public.branch_receipt_config (updated_at DESC);

ALTER TABLE public.branch_receipt_config ENABLE ROW LEVEL SECURITY;

-- super_admin: full access
DROP POLICY IF EXISTS branch_receipt_config_super_admin ON public.branch_receipt_config;
CREATE POLICY branch_receipt_config_super_admin ON public.branch_receipt_config
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'super_admin')
  WITH CHECK (public.current_app_role() = 'super_admin');

-- branch members: read only (for receipt rendering)
DROP POLICY IF EXISTS branch_receipt_config_read ON public.branch_receipt_config;
CREATE POLICY branch_receipt_config_read ON public.branch_receipt_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      JOIN public.branches b ON b.id = branch_receipt_config.branch_id
       WHERE up.id = auth.uid()
         AND up.school_id = b.school_id
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.branch_receipt_config_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_branch_receipt_config_updated_at ON public.branch_receipt_config;
CREATE TRIGGER trg_branch_receipt_config_updated_at
  BEFORE UPDATE ON public.branch_receipt_config
  FOR EACH ROW EXECUTE FUNCTION public.branch_receipt_config_set_updated_at();
