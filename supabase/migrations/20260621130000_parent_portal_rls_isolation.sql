-- ============================================================
-- Parent portal RLS isolation — CRITICAL, apply before any parent
-- account is created.
--
-- Root cause: students/grade_entries/behavior_records SELECT policies
-- used current_user_can_access_branch which passes for any
-- managed_user_profiles row (including role='parent'), so a parent
-- with the anon key could read ALL students' PII, grades, and
-- behavior records school-wide.
--
-- attendance/payments had no parent path at all → parent dashboard
-- returned empty data for those tables.
--
-- Fix:
--   • Existing broad policies: add current_app_role() != 'parent' guard
--   • New *_parent_select policies: scoped to parent_student_links
-- Mobile is unaffected (service-role client bypasses RLS).
-- Web admin/teacher paths are unaffected (role != 'parent').
-- Applied to prod via Supabase MCP 2026-06-21.
-- ============================================================

-- 1. STUDENTS
DROP POLICY IF EXISTS students_select ON public.students;
CREATE POLICY students_select ON public.students FOR SELECT TO authenticated
USING (
  current_app_role() != 'parent'
  AND current_user_can_access_branch(branch_id, school_id)
);

DROP POLICY IF EXISTS students_parent_select ON public.students;
CREATE POLICY students_parent_select ON public.students FOR SELECT TO authenticated
USING (
  current_app_role() = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid()
      AND psl.student_id = students.id
      AND psl.school_id = students.school_id
  )
);

-- 2. GRADE_ENTRIES
DROP POLICY IF EXISTS grade_entries_select ON public.grade_entries;
CREATE POLICY grade_entries_select ON public.grade_entries FOR SELECT TO authenticated
USING (
  current_app_role() != 'parent'
  AND current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = grade_entries.student_id LIMIT 1),
    school_id
  )
);

DROP POLICY IF EXISTS grade_entries_parent_select ON public.grade_entries;
CREATE POLICY grade_entries_parent_select ON public.grade_entries FOR SELECT TO authenticated
USING (
  current_app_role() = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid()
      AND psl.student_id = grade_entries.student_id
      AND psl.school_id = grade_entries.school_id
  )
);

-- 3. BEHAVIOR_RECORDS
DROP POLICY IF EXISTS behavior_records_select_same_school ON public.behavior_records;
CREATE POLICY behavior_records_select_same_school ON public.behavior_records FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.managed_user_profiles m
    WHERE m.auth_user_id = auth.uid()
      AND m.school_id = behavior_records.school_id
      AND m.role != 'parent'
  )
);

DROP POLICY IF EXISTS behavior_records_parent_select ON public.behavior_records;
CREATE POLICY behavior_records_parent_select ON public.behavior_records FOR SELECT TO authenticated
USING (
  current_app_role() = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid()
      AND psl.student_id = behavior_records.student_id
      AND psl.school_id = behavior_records.school_id
  )
);

-- 4. ATTENDANCE — parents had no SELECT policy → dashboard returned empty
DROP POLICY IF EXISTS attendance_parent_select ON public.attendance;
CREATE POLICY attendance_parent_select ON public.attendance FOR SELECT TO authenticated
USING (
  current_app_role() = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid()
      AND psl.student_id = attendance.student_id
      AND psl.school_id = attendance.school_id
  )
);

-- 5. PAYMENTS — parents were blocked by admin-only role gate → dashboard returned empty
DROP POLICY IF EXISTS payments_parent_select ON public.payments;
CREATE POLICY payments_parent_select ON public.payments FOR SELECT TO authenticated
USING (
  current_app_role() = 'parent'
  AND EXISTS (
    SELECT 1 FROM public.parent_student_links psl
    WHERE psl.parent_user_id = auth.uid()
      AND psl.student_id = payments.student_id
      AND psl.school_id = payments.school_id
  )
  AND deleted_at IS NULL
);
