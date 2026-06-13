-- Migration: Add settings columns for receipt, academic calendar, and fee rules
-- These columns support the new Settings tabs added to the dashboard.
-- All nullable with no defaults so existing rows are unaffected.

-- Receipt Settings
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS receipt_footer_text TEXT,
  ADD COLUMN IF NOT EXISTS receipt_address     TEXT,
  ADD COLUMN IF NOT EXISTS receipt_tax_number  TEXT;

-- Academic Calendar
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS academic_year_label TEXT,
  ADD COLUMN IF NOT EXISTS semester1_start     DATE,
  ADD COLUMN IF NOT EXISTS semester1_end       DATE,
  ADD COLUMN IF NOT EXISTS semester2_start     DATE,
  ADD COLUMN IF NOT EXISTS semester2_end       DATE;

-- Fee & Penalty Rules
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS late_payment_grace_days   INTEGER,
  ADD COLUMN IF NOT EXISTS late_payment_penalty_pct  NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS max_penalty_pct           NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS discount_early_pct        NUMERIC(5,2);
