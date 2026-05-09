-- Migration 000008: Add missing branding/theming columns
-- These columns are probed by schema-compat.ts and enable branding features.
-- All nullable with no defaults (except is_main) so existing rows are unaffected.

-- schools: color + theme support
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS primary_color   TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color TEXT,
  ADD COLUMN IF NOT EXISTS theme_preset    TEXT;

-- branches: full branding support
ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS primary_color        TEXT,
  ADD COLUMN IF NOT EXISTS secondary_color      TEXT,
  ADD COLUMN IF NOT EXISTS sidebar_color        TEXT,
  ADD COLUMN IF NOT EXISTS accent_color         TEXT,
  ADD COLUMN IF NOT EXISTS text_color           TEXT,
  ADD COLUMN IF NOT EXISTS topbar_color         TEXT,
  ADD COLUMN IF NOT EXISTS logo_url             TEXT,
  ADD COLUMN IF NOT EXISTS receipt_bg_url       TEXT,
  ADD COLUMN IF NOT EXISTS card_bg_url          TEXT,
  ADD COLUMN IF NOT EXISTS font_family          TEXT,
  ADD COLUMN IF NOT EXISTS short_name           TEXT,
  ADD COLUMN IF NOT EXISTS receipt_footer_text  TEXT,
  ADD COLUMN IF NOT EXISTS is_main              BOOLEAN NOT NULL DEFAULT false;
