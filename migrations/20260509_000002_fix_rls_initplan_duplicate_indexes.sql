-- Fix auth_rls_initplan: wrap auth.uid() in SELECT to avoid per-row re-evaluation
DROP POLICY IF EXISTS school_data_archives_isolation ON public.school_data_archives;
CREATE POLICY school_data_archives_isolation ON public.school_data_archives
  FOR ALL
  USING (
    (school_id = get_current_user_school_id())
    OR (EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = (SELECT auth.uid())
        AND user_profiles.role = 'super_admin'
    ))
  );

-- Drop duplicate indexes (keep the _id suffixed variants)
DROP INDEX IF EXISTS public.idx_attendance_student;
DROP INDEX IF EXISTS public.idx_payments_student;
DROP INDEX IF EXISTS public.idx_students_branch;
