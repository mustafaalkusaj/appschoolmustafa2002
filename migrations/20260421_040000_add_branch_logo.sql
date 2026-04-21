-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add logo_url column to branches table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT NULL;
