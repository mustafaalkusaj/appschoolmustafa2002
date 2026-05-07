-- Per-school receipt customization (decorative images uploaded by super admin).
-- Receipts are A5 styled HTML; this table stores decoration URLs and copy.

CREATE TABLE IF NOT EXISTS public.school_receipt_config (
  school_id               UUID PRIMARY KEY REFERENCES public.schools(id) ON DELETE CASCADE,
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
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by              UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_school_receipt_config_updated_at
  ON public.school_receipt_config (updated_at DESC);

ALTER TABLE public.school_receipt_config ENABLE ROW LEVEL SECURITY;

-- super_admin: full access
DROP POLICY IF EXISTS school_receipt_config_super_admin ON public.school_receipt_config;
CREATE POLICY school_receipt_config_super_admin ON public.school_receipt_config
  FOR ALL TO authenticated
  USING (public.current_app_role() = 'super_admin')
  WITH CHECK (public.current_app_role() = 'super_admin');

-- school members: read only (for receipt rendering)
DROP POLICY IF EXISTS school_receipt_config_read ON public.school_receipt_config;
CREATE POLICY school_receipt_config_read ON public.school_receipt_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
       WHERE up.id = auth.uid()
         AND school_receipt_config.school_id = up.school_id
    )
  );

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.school_receipt_config_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_school_receipt_config_updated_at ON public.school_receipt_config;
CREATE TRIGGER trg_school_receipt_config_updated_at
  BEFORE UPDATE ON public.school_receipt_config
  FOR EACH ROW EXECUTE FUNCTION public.school_receipt_config_set_updated_at();
