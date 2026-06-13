-- Add performance indexes to teachers table for school/branch scoped queries
CREATE INDEX IF NOT EXISTS idx_teachers_school_id
  ON public.teachers USING btree (school_id);

CREATE INDEX IF NOT EXISTS idx_teachers_branch_id
  ON public.teachers USING btree (branch_id);

CREATE INDEX IF NOT EXISTS idx_teachers_school_branch
  ON public.teachers USING btree (school_id, branch_id);

CREATE INDEX IF NOT EXISTS idx_teachers_school_status
  ON public.teachers USING btree (school_id, status)
  WHERE status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_teachers_school_name
  ON public.teachers USING btree (school_id, full_name);
