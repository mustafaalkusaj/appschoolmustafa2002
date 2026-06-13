-- Migration: 20260429_000000_budgets_schema
-- Create budgets and budget_items tables for school manager dashboard
-- Tracks planned vs actual income/expenses for fiscal years
-- Design: One budget per school/fiscal_year with items distributed by branch

-- ============================================================================
-- TABLE: budgets
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),

  -- Prevent duplicate budgets for same school/fiscal_year
  UNIQUE(school_id, fiscal_year)
);

-- ============================================================================
-- TABLE: budget_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.budget_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  budget_id UUID NOT NULL REFERENCES public.budgets(id) ON DELETE CASCADE,
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,

  category TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('income', 'expense')),
  description TEXT,
  planned_amount NUMERIC(15, 3) NOT NULL DEFAULT 0 CHECK (planned_amount >= 0),

  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ============================================================================
-- VALIDATION: school_id consistency between budgets and budget_items
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_budget_item_school_id()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure budget_items.school_id matches its budget's school_id
  IF NEW.school_id != (SELECT school_id FROM public.budgets WHERE id = NEW.budget_id) THEN
    RAISE EXCEPTION 'budget_items.school_id (%) must match budgets.school_id (%)',
      NEW.school_id,
      (SELECT school_id FROM public.budgets WHERE id = NEW.budget_id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_item_school_id_check ON public.budget_items;
CREATE TRIGGER trg_budget_item_school_id_check
BEFORE INSERT OR UPDATE ON public.budget_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_budget_item_school_id();

-- ============================================================================
-- VALIDATION: branch_id must belong to same school
-- ============================================================================
CREATE OR REPLACE FUNCTION public.validate_budget_item_branch_school()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.branch_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.branches
      WHERE id = NEW.branch_id AND school_id = NEW.school_id
    ) THEN
      RAISE EXCEPTION 'branch_id (%) does not belong to school_id (%)',
        NEW.branch_id, NEW.school_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budget_item_branch_school_check ON public.budget_items;
CREATE TRIGGER trg_budget_item_branch_school_check
BEFORE INSERT OR UPDATE ON public.budget_items
FOR EACH ROW
EXECUTE FUNCTION public.validate_budget_item_branch_school();

-- ============================================================================
-- PROTECTION: Prevent budget school_id change
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_budget_school_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'Cannot change budget school_id after creation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_budget_school_change ON public.budgets;
CREATE TRIGGER trg_prevent_budget_school_change
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.prevent_budget_school_change();

-- ============================================================================
-- PROTECTION: Prevent budget_item identity changes
-- ============================================================================
CREATE OR REPLACE FUNCTION public.prevent_budget_item_identity_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.school_id IS DISTINCT FROM NEW.school_id THEN
    RAISE EXCEPTION 'Cannot change budget_item school_id after creation';
  END IF;

  IF OLD.budget_id IS DISTINCT FROM NEW.budget_id THEN
    RAISE EXCEPTION 'Cannot change budget_item budget_id after creation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_budget_item_identity_change ON public.budget_items;
CREATE TRIGGER trg_prevent_budget_item_identity_change
BEFORE UPDATE ON public.budget_items
FOR EACH ROW
EXECUTE FUNCTION public.prevent_budget_item_identity_change();

-- ============================================================================
-- AUTO-UPDATE: updated_at timestamp
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_budgets_update_timestamp ON public.budgets;
CREATE TRIGGER trg_budgets_update_timestamp
BEFORE UPDATE ON public.budgets
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

DROP TRIGGER IF EXISTS trg_budget_items_update_timestamp ON public.budget_items;
CREATE TRIGGER trg_budget_items_update_timestamp
BEFORE UPDATE ON public.budget_items
FOR EACH ROW
EXECUTE FUNCTION public.update_timestamp();

-- ============================================================================
-- INDEXES: Performance optimization
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_budgets_school_fiscal_year ON public.budgets(school_id, fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budgets_school_status ON public.budgets(school_id, status);
CREATE INDEX IF NOT EXISTS idx_budget_items_budget_id ON public.budget_items(budget_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_school_id ON public.budget_items(school_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_school_branch ON public.budget_items(school_id, branch_id);
CREATE INDEX IF NOT EXISTS idx_budget_items_type ON public.budget_items(item_type);

-- ============================================================================
-- RLS: Row Level Security
-- ============================================================================
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICY: budgets SELECT
-- School managers see their own school's budgets, super_admin sees all
-- ============================================================================
DROP POLICY IF EXISTS budget_select_own_school ON public.budgets;
CREATE POLICY budget_select_own_school ON public.budgets
  FOR SELECT
  USING (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- RLS POLICY: budget_items SELECT
-- ============================================================================
DROP POLICY IF EXISTS budget_items_select_own_school ON public.budget_items;
CREATE POLICY budget_items_select_own_school ON public.budget_items
  FOR SELECT
  USING (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- RLS POLICY: budgets INSERT
-- ============================================================================
DROP POLICY IF EXISTS budget_insert_own_school ON public.budgets;
CREATE POLICY budget_insert_own_school ON public.budgets
  FOR INSERT
  WITH CHECK (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- RLS POLICY: budget_items INSERT
-- ============================================================================
DROP POLICY IF EXISTS budget_items_insert_own_school ON public.budget_items;
CREATE POLICY budget_items_insert_own_school ON public.budget_items
  FOR INSERT
  WITH CHECK (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- RLS POLICY: budgets UPDATE
-- Simple: just verify user can access their own school
-- Triggers prevent structural changes (school_id cannot change)
-- ============================================================================
DROP POLICY IF EXISTS budget_update_own_school ON public.budgets;
CREATE POLICY budget_update_own_school ON public.budgets
  FOR UPDATE
  USING (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- RLS POLICY: budget_items UPDATE
-- Simple: just verify user can access their own school
-- Triggers prevent structural changes (school_id, budget_id cannot change)
-- ============================================================================
DROP POLICY IF EXISTS budget_items_update_own_school ON public.budget_items;
CREATE POLICY budget_items_update_own_school ON public.budget_items
  FOR UPDATE
  USING (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
  WITH CHECK (
    school_id = (SELECT school_id FROM public.user_profiles WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- ============================================================================
-- PERMISSIONS: Grant access to authenticated users
-- ============================================================================
GRANT SELECT, INSERT, UPDATE ON public.budgets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.budget_items TO authenticated;
