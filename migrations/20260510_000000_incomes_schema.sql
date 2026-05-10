-- ============================================================================
-- Income Types & Incomes tables (mirrors expenses pattern)
-- Full branch isolation via branch_id column
-- ============================================================================

-- 1. Income Types
CREATE TABLE IF NOT EXISTS income_types (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id   TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id   TEXT REFERENCES branches(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  notes       TEXT,
  deleted_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_income_types_school ON income_types(school_id);
CREATE INDEX idx_income_types_branch ON income_types(branch_id);
CREATE INDEX idx_income_types_school_branch ON income_types(school_id, branch_id);

-- 2. Incomes
CREATE TABLE IF NOT EXISTS incomes (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  school_id       TEXT NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
  branch_id       TEXT REFERENCES branches(id) ON DELETE CASCADE,
  income_type_id  TEXT NOT NULL REFERENCES income_types(id) ON DELETE RESTRICT,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  income_date     DATE NOT NULL,
  source          TEXT,
  receipt_number  TEXT,
  notes           TEXT,
  deleted_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incomes_school ON incomes(school_id);
CREATE INDEX idx_incomes_branch ON incomes(branch_id);
CREATE INDEX idx_incomes_school_branch ON incomes(school_id, branch_id);
CREATE INDEX idx_incomes_type ON incomes(income_type_id);
CREATE INDEX idx_incomes_date ON incomes(school_id, income_date DESC);
CREATE INDEX idx_incomes_school_branch_date ON incomes(school_id, branch_id, income_date DESC);

-- 3. RLS Policies
ALTER TABLE income_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;

-- income_types: authenticated users with matching school
CREATE POLICY "income_types_select" ON income_types
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "income_types_insert" ON income_types
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "income_types_update" ON income_types
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "income_types_delete" ON income_types
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

-- incomes: authenticated users with matching school
CREATE POLICY "incomes_select" ON incomes
  FOR SELECT TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "incomes_insert" ON incomes
  FOR INSERT TO authenticated
  WITH CHECK (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "incomes_update" ON incomes
  FOR UPDATE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );

CREATE POLICY "incomes_delete" ON incomes
  FOR DELETE TO authenticated
  USING (
    school_id IN (
      SELECT school_id FROM users WHERE id = auth.uid()::text
    )
  );
