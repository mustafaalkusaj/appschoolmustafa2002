-- Drop columns that are never written by any trigger and never read in code.
-- total_expenses, total_salaries, total_discounts have been 0 since table creation.
-- current_balance was GENERATED AS (total_income - total_expenses) = always equalled
-- total_income. Recreated as GENERATED AS (total_income) after dropping total_expenses.
-- Applied to prod via Supabase MCP 2026-06-21.

ALTER TABLE public.financial_summary DROP COLUMN current_balance;

ALTER TABLE public.financial_summary
  DROP COLUMN total_expenses,
  DROP COLUMN total_salaries,
  DROP COLUMN total_discounts;

ALTER TABLE public.financial_summary
  ADD COLUMN current_balance numeric(14,2) GENERATED ALWAYS AS (total_income) STORED;
