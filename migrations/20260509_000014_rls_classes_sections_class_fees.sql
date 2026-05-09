-- Add RLS policies for classes, sections, and class_fees tables.
-- These tables currently rely entirely on application-level branch filtering
-- (dashboard-admin-server.ts). Adding DB-level RLS provides defense-in-depth
-- and protects against any future application-layer bypass.

-- ============================================================
-- classes
-- ============================================================

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "classes_select" ON public.classes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'employee', 'group_admin') AND classes.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND classes.school_id = up.school_id
            AND (classes.branch_id IS NULL OR classes.branch_id = up.branch_id))
      )
  )
);

CREATE POLICY "classes_insert" ON public.classes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND classes.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND classes.school_id = up.school_id
            AND (classes.branch_id IS NULL OR classes.branch_id = up.branch_id))
      )
  )
);

CREATE POLICY "classes_update" ON public.classes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND classes.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND classes.school_id = up.school_id
            AND (classes.branch_id IS NULL OR classes.branch_id = up.branch_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND classes.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND classes.school_id = up.school_id
            AND (classes.branch_id IS NULL OR classes.branch_id = up.branch_id))
      )
  )
);

CREATE POLICY "classes_delete" ON public.classes FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND classes.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND classes.school_id = up.school_id
            AND (classes.branch_id IS NULL OR classes.branch_id = up.branch_id))
      )
  )
);

-- ============================================================
-- sections (no branch_id column — isolated via parent class)
-- ============================================================

ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "sections_select" ON public.sections FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'employee', 'group_admin') AND sections.school_id = up.school_id)
        OR (
          up.role = 'branch_admin'
          AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = sections.class_id
              AND c.school_id = up.school_id
              AND (c.branch_id IS NULL OR c.branch_id = up.branch_id)
          )
        )
      )
  )
);

CREATE POLICY "sections_insert" ON public.sections FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND sections.school_id = up.school_id)
        OR (
          up.role = 'branch_admin'
          AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = sections.class_id
              AND c.school_id = up.school_id
              AND (c.branch_id IS NULL OR c.branch_id = up.branch_id)
          )
        )
      )
  )
);

CREATE POLICY "sections_update" ON public.sections FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND sections.school_id = up.school_id)
        OR (
          up.role = 'branch_admin'
          AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = sections.class_id
              AND c.school_id = up.school_id
              AND (c.branch_id IS NULL OR c.branch_id = up.branch_id)
          )
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND sections.school_id = up.school_id)
        OR (
          up.role = 'branch_admin'
          AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = sections.class_id
              AND c.school_id = up.school_id
              AND (c.branch_id IS NULL OR c.branch_id = up.branch_id)
          )
        )
      )
  )
);

CREATE POLICY "sections_delete" ON public.sections FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND sections.school_id = up.school_id)
        OR (
          up.role = 'branch_admin'
          AND EXISTS (
            SELECT 1 FROM public.classes c
            WHERE c.id = sections.class_id
              AND c.school_id = up.school_id
              AND (c.branch_id IS NULL OR c.branch_id = up.branch_id)
          )
        )
      )
  )
);

-- ============================================================
-- class_fees
-- ============================================================

ALTER TABLE public.class_fees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "class_fees_select" ON public.class_fees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'employee', 'group_admin') AND class_fees.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND class_fees.school_id = up.school_id
            AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
      )
  )
);

CREATE POLICY "class_fees_insert" ON public.class_fees FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND class_fees.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND class_fees.school_id = up.school_id
            AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
      )
  )
);

CREATE POLICY "class_fees_update" ON public.class_fees FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND class_fees.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND class_fees.school_id = up.school_id
            AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND class_fees.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND class_fees.school_id = up.school_id
            AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
      )
  )
);

CREATE POLICY "class_fees_delete" ON public.class_fees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (up.role IN ('admin', 'group_admin') AND class_fees.school_id = up.school_id)
        OR (up.role = 'branch_admin' AND class_fees.school_id = up.school_id
            AND (class_fees.branch_id IS NULL OR class_fees.branch_id = up.branch_id))
      )
  )
);
