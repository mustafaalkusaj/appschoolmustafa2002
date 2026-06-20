-- ============================================================
-- Deep-audit round 3 — RLS hardening + money-column widening.
-- Applied to prod via Supabase MCP 2026-06-21. Recorded for repo parity.
-- ============================================================

-- payments_select had no role gate → any school member (teacher/parent) could read
-- the whole ledger via the public anon key. Web users are admin/super_admin/employee;
-- mobile reads via service-role (RLS bypassed). Add a role gate.
DROP POLICY IF EXISTS payments_select ON public.payments;
CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
USING (
  current_app_role() IN ('admin','super_admin','employee')
  AND current_user_can_access_branch(branch_id, school_id)
);

-- teacher_activities_write (ALL) let any teacher edit/delete co-workers' rows via anon
-- key (no teacher_id=self). Split: admins school-wide, teachers only their own.
DROP POLICY IF EXISTS teacher_activities_write ON public.teacher_activities;
CREATE POLICY teacher_activities_admin_write ON public.teacher_activities FOR ALL TO authenticated
USING (current_app_role() = ANY (ARRAY['admin','super_admin']) AND (current_app_role() = 'super_admin' OR school_id = current_school_id()))
WITH CHECK (current_app_role() = ANY (ARRAY['admin','super_admin']) AND (current_app_role() = 'super_admin' OR school_id = current_school_id()));
CREATE POLICY teacher_activities_teacher_write ON public.teacher_activities FOR ALL TO authenticated
USING (current_app_role() = 'teacher' AND school_id = current_school_id() AND teacher_id = current_teacher_id())
WITH CHECK (current_app_role() = 'teacher' AND school_id = current_school_id() AND teacher_id = current_teacher_id());

-- Widen salaries money columns integer -> numeric(14,2) (net_salary is generated).
ALTER TABLE public.salaries DROP COLUMN net_salary;
ALTER TABLE public.salaries
  ALTER COLUMN gross_salary TYPE numeric(14,2),
  ALTER COLUMN deductions   TYPE numeric(14,2);
ALTER TABLE public.salaries
  ADD COLUMN net_salary numeric(14,2) GENERATED ALWAYS AS (gross_salary - deductions) STORED;

-- Widen financial_summary totals integer -> numeric(14,2) (current_balance is generated).
ALTER TABLE public.financial_summary DROP COLUMN current_balance;
ALTER TABLE public.financial_summary
  ALTER COLUMN total_income    TYPE numeric(14,2),
  ALTER COLUMN total_expenses  TYPE numeric(14,2),
  ALTER COLUMN total_salaries  TYPE numeric(14,2),
  ALTER COLUMN total_discounts TYPE numeric(14,2);
ALTER TABLE public.financial_summary
  ADD COLUMN current_balance numeric(14,2) GENERATED ALWAYS AS (total_income - total_expenses) STORED;

-- NOTE (not auto-fixed — needs role-aware RLS redesign before parent onboarding):
-- students/grade_entries/attendance SELECT use current_user_can_access_branch with no
-- role/parent-link gate, so a 'parent' (managed_user_profiles) could read all students'
-- data via anon key. Currently 0 parent accounts exist and the app reads via service-role,
-- so not live-exploitable, but parent-restrictive policies (gated on parent_student_links)
-- are required before any parent account is created.
