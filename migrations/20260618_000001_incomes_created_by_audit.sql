-- Add created_by audit column to incomes table
-- Tracks which user recorded each income entry for financial audit trail.
ALTER TABLE incomes
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_incomes_created_by ON incomes(created_by);
