-- Add write policies for branches table
-- Previously only had FOR SELECT ("branch_users_see_own_branch")
-- Super admins and school admins need INSERT/UPDATE/DELETE

-- ── INSERT ──────────────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "branches_insert_policy"
  ON public.branches
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'admin' AND up.school_id = branches.school_id)
        )
    )
  );

-- ── UPDATE ──────────────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "branches_update_policy"
  ON public.branches
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'admin' AND up.school_id = branches.school_id)
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND (
          up.role = 'super_admin'
          OR (up.role = 'admin' AND up.school_id = branches.school_id)
        )
    )
  );

-- ── DELETE ──────────────────────────────────────────────────────────────────
CREATE POLICY IF NOT EXISTS "branches_delete_policy"
  ON public.branches
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid()
        AND up.role = 'super_admin'
    )
  );
