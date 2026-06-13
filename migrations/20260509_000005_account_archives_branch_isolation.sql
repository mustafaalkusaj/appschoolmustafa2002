-- Add branch_id to account_archives for proper branch isolation
-- Archives were previously school-scoped only; branches overwrote each other.

-- 1. Add branch_id column (nullable — NULL = school-wide archive)
ALTER TABLE public.account_archives
  ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE;

-- 2. Drop the old school-wide unique constraint
ALTER TABLE public.account_archives
  DROP CONSTRAINT IF EXISTS account_archives_school_id_archive_year_key;

-- 3. Partial unique indexes: one per scope
--    School-wide archives (branch_id IS NULL): one per school per year
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_archives_school_year_no_branch
  ON public.account_archives (school_id, archive_year)
  WHERE branch_id IS NULL;

--    Branch-scoped archives: one per (school, branch, year)
CREATE UNIQUE INDEX IF NOT EXISTS uq_account_archives_school_branch_year
  ON public.account_archives (school_id, branch_id, archive_year)
  WHERE branch_id IS NOT NULL;

-- 4. Index for branch lookups
CREATE INDEX IF NOT EXISTS idx_account_archives_branch_id
  ON public.account_archives (branch_id)
  WHERE branch_id IS NOT NULL;

-- 5. Drop old RLS policies and recreate with branch awareness

DROP POLICY IF EXISTS tenant_select_policy ON public.account_archives;
CREATE POLICY tenant_select_policy
ON public.account_archives
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        -- Super admin: full access
        up.role = 'super_admin'

        -- Group/school admin: all archives for their school
        OR (
          up.role IN ('admin', 'group_admin')
          AND account_archives.school_id = up.school_id
        )

        -- Branch admin/employee: own school + own branch (or school-wide archives)
        OR (
          up.role IN ('branch_admin', 'employee')
          AND account_archives.school_id = up.school_id
          AND (
            account_archives.branch_id IS NULL
            OR account_archives.branch_id = up.branch_id
          )
        )
      )
  )
);

DROP POLICY IF EXISTS tenant_insert_policy ON public.account_archives;
CREATE POLICY tenant_insert_policy
ON public.account_archives
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role IN ('admin', 'group_admin')
          AND account_archives.school_id = up.school_id
          AND (
            account_archives.branch_id IS NULL
            OR EXISTS (
              SELECT 1 FROM public.branches b
              WHERE b.id = account_archives.branch_id
                AND b.school_id = up.school_id
            )
          )
        )
        OR (
          up.role IN ('branch_admin', 'employee')
          AND account_archives.school_id = up.school_id
          AND account_archives.branch_id = up.branch_id
        )
      )
  )
);

DROP POLICY IF EXISTS tenant_update_policy ON public.account_archives;
CREATE POLICY tenant_update_policy
ON public.account_archives
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role IN ('admin', 'group_admin')
          AND account_archives.school_id = up.school_id
        )
        OR (
          up.role IN ('branch_admin', 'employee')
          AND account_archives.school_id = up.school_id
          AND account_archives.branch_id = up.branch_id
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
        OR (
          up.role IN ('admin', 'group_admin')
          AND account_archives.school_id = up.school_id
        )
        OR (
          up.role IN ('branch_admin', 'employee')
          AND account_archives.school_id = up.school_id
          AND account_archives.branch_id = up.branch_id
        )
      )
  )
);

DROP POLICY IF EXISTS tenant_delete_policy ON public.account_archives;
CREATE POLICY tenant_delete_policy
ON public.account_archives
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND (
        up.role = 'super_admin'
        OR (
          up.role IN ('admin', 'group_admin')
          AND account_archives.school_id = up.school_id
        )
        OR (
          up.role IN ('branch_admin', 'employee')
          AND account_archives.school_id = up.school_id
          AND account_archives.branch_id = up.branch_id
        )
      )
  )
);
