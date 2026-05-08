-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: Add receipt_bg_url column to branches table
-- Allows super admin to set a custom background image for printed receipts
-- per branch.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.branches
  ADD COLUMN IF NOT EXISTS receipt_bg_url TEXT DEFAULT NULL;
