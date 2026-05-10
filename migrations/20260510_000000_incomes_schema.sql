-- Migration: incomes_schema
-- Applied: 2026-05-10
-- Tables: income_types, incomes (with RLS)

-- Drop existing policies if they exist
DROP POLICY IF EXISTS income_types_select ON income_types;
DROP POLICY IF EXISTS income_types_insert ON income_types;
DROP POLICY IF EXISTS income_types_update ON income_types;
DROP POLICY IF EXISTS income_types_delete ON income_types;
DROP POLICY IF EXISTS incomes_select ON incomes;
DROP POLICY IF EXISTS incomes_insert ON incomes;
DROP POLICY IF EXISTS incomes_update ON incomes;
DROP POLICY IF EXISTS incomes_delete ON incomes;

-- Income types lookup table
CREATE TABLE IF NOT EXISTS income_types (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  notes       TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_income_types_school_id ON income_types(school_id);
CREATE INDEX IF NOT EXISTS idx_income_types_branch_id ON income_types(branch_id);
CREATE INDEX IF NOT EXISTS idx_income_types_deleted_at ON income_types(deleted_at);

-- Incomes records table
CREATE TABLE IF NOT EXISTS incomes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id       UUID REFERENCES branches(id) ON DELETE CASCADE,
  income_type_id  UUID REFERENCES income_types(id) ON DELETE SET NULL,
  amount          NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  income_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  source          TEXT,
  receipt_number  TEXT,
  notes           TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_incomes_school_id ON incomes(school_id);
CREATE INDEX IF NOT EXISTS idx_incomes_branch_id ON incomes(branch_id);
CREATE INDEX IF NOT EXISTS idx_incomes_income_type_id ON incomes(income_type_id);
CREATE INDEX IF NOT EXISTS idx_incomes_income_date ON incomes(income_date);
CREATE INDEX IF NOT EXISTS idx_incomes_deleted_at ON incomes(deleted_at);

-- Enable RLS
ALTER TABLE income_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for income_types
CREATE POLICY income_types_select ON income_types FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY income_types_insert ON income_types FOR INSERT
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY income_types_update ON income_types FOR UPDATE
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY income_types_delete ON income_types FOR DELETE
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

-- RLS Policies for incomes
CREATE POLICY incomes_select ON incomes FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY incomes_insert ON incomes FOR INSERT
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY incomes_update ON incomes FOR UPDATE
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));

CREATE POLICY incomes_delete ON incomes FOR DELETE
  USING (school_id IN (SELECT school_id FROM users WHERE id = auth.uid()));
