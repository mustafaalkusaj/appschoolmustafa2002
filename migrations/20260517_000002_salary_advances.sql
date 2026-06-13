-- Salary Advances (سلف الرواتب)
-- Applied: 2026-05-17

CREATE TABLE IF NOT EXISTS public.salary_advances (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id     UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  branch_id     UUID REFERENCES public.branches(id) ON DELETE SET NULL,
  teacher_id    UUID NOT NULL REFERENCES public.teachers(id) ON DELETE CASCADE,
  amount        NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  reason        TEXT,
  advance_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  is_deducted   BOOLEAN NOT NULL DEFAULT false,
  deducted_on   DATE,
  notes         TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_advances ENABLE ROW LEVEL SECURITY;

-- Admins can do everything; service_role bypasses RLS
CREATE POLICY "school_admin_salary_advances_all"
  ON public.salary_advances FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = salary_advances.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.school_id = salary_advances.school_id
        AND up.role IN ('super_admin', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_salary_advances_school_id    ON public.salary_advances(school_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_teacher_id   ON public.salary_advances(teacher_id);
CREATE INDEX IF NOT EXISTS idx_salary_advances_advance_date ON public.salary_advances(advance_date DESC);
CREATE INDEX IF NOT EXISTS idx_salary_advances_is_deducted  ON public.salary_advances(is_deducted);
