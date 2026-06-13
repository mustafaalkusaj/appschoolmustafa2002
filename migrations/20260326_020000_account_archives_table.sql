CREATE TABLE IF NOT EXISTS public.account_archives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools(id) ON DELETE CASCADE,
  archive_year INTEGER NOT NULL,
  total_students INTEGER NOT NULL DEFAULT 0,
  total_payments INTEGER NOT NULL DEFAULT 0,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  archive_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (school_id, archive_year)
);

CREATE INDEX IF NOT EXISTS idx_account_archives_school_id
  ON public.account_archives(school_id);

CREATE INDEX IF NOT EXISTS idx_account_archives_year
  ON public.account_archives(archive_year);

ALTER TABLE public.account_archives ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_select_policy ON public.account_archives;
CREATE POLICY tenant_select_policy
ON public.account_archives
FOR SELECT
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS tenant_insert_policy ON public.account_archives;
CREATE POLICY tenant_insert_policy
ON public.account_archives
FOR INSERT
TO authenticated
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS tenant_update_policy ON public.account_archives;
CREATE POLICY tenant_update_policy
ON public.account_archives
FOR UPDATE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
)
WITH CHECK (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);

DROP POLICY IF EXISTS tenant_delete_policy ON public.account_archives;
CREATE POLICY tenant_delete_policy
ON public.account_archives
FOR DELETE
TO authenticated
USING (
  public.current_app_role() = 'super_admin'
  OR school_id = public.current_school_id()
);
