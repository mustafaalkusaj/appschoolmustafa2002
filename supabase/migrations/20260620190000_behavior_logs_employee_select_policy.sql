-- Add SELECT policy for employees on behavior_logs
-- Previously only admin/super_admin had access, but the API allows employees
CREATE POLICY "behavior_logs_employee_select_policy"
ON public.behavior_logs
FOR SELECT
TO authenticated
USING (
  (current_app_role() = 'employee'::text AND school_id = current_school_id())
);
