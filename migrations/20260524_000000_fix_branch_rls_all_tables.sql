-- Fix branch-aware RLS on all branch-sensitive tables
-- Previously: teacher_evaluations/leaves had SELECT-only policies (school-level)
-- Previously: daily_lectures/teacher_assignments had school-only policies
-- Previously: grade_entries/student_badges/student_goals had school-only policies
-- Fix: upgrade all to branch-aware using current_user_can_access_branch()

-- ---- teacher_evaluations ----
DROP POLICY IF EXISTS "teacher_evaluations_school_read" ON public.teacher_evaluations;

CREATE POLICY "teacher_evaluations_select"
  ON public.teacher_evaluations FOR SELECT TO authenticated
  USING (current_user_can_access_branch(branch_id, school_id));

CREATE POLICY "teacher_evaluations_insert"
  ON public.teacher_evaluations FOR INSERT TO authenticated
  WITH CHECK (current_user_can_access_branch(branch_id, school_id));

CREATE POLICY "teacher_evaluations_update"
  ON public.teacher_evaluations FOR UPDATE TO authenticated
  USING (current_user_can_access_branch(branch_id, school_id))
  WITH CHECK (current_user_can_access_branch(branch_id, school_id));

CREATE POLICY "teacher_evaluations_delete"
  ON public.teacher_evaluations FOR DELETE TO authenticated
  USING (current_user_can_access_branch(branch_id, school_id));


-- ---- teacher_leaves ----
DROP POLICY IF EXISTS "teacher_leaves_school_read" ON public.teacher_leaves;

CREATE POLICY "teacher_leaves_select"
  ON public.teacher_leaves FOR SELECT TO authenticated
  USING (current_user_can_access_branch(branch_id, school_id));

CREATE POLICY "teacher_leaves_insert"
  ON public.teacher_leaves FOR INSERT TO authenticated
  WITH CHECK (current_user_can_access_branch(branch_id, school_id));

CREATE POLICY "teacher_leaves_update"
  ON public.teacher_leaves FOR UPDATE TO authenticated
  USING (current_user_can_access_branch(branch_id, school_id))
  WITH CHECK (current_user_can_access_branch(branch_id, school_id));

CREATE POLICY "teacher_leaves_delete"
  ON public.teacher_leaves FOR DELETE TO authenticated
  USING (current_user_can_access_branch(branch_id, school_id));


-- ---- daily_lectures (no branch_id column — resolve via teachers.branch_id) ----
DROP POLICY IF EXISTS "daily_lectures_select" ON public.daily_lectures;
DROP POLICY IF EXISTS "daily_lectures_insert" ON public.daily_lectures;
DROP POLICY IF EXISTS "daily_lectures_update" ON public.daily_lectures;
DROP POLICY IF EXISTS "daily_lectures_delete" ON public.daily_lectures;

CREATE POLICY "daily_lectures_select"
  ON public.daily_lectures FOR SELECT TO public
  USING (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = daily_lectures.teacher_id LIMIT 1),
    school_id));

CREATE POLICY "daily_lectures_insert"
  ON public.daily_lectures FOR INSERT TO public
  WITH CHECK (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = daily_lectures.teacher_id LIMIT 1),
    school_id));

CREATE POLICY "daily_lectures_update"
  ON public.daily_lectures FOR UPDATE TO public
  USING (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = daily_lectures.teacher_id LIMIT 1),
    school_id))
  WITH CHECK (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = daily_lectures.teacher_id LIMIT 1),
    school_id));

CREATE POLICY "daily_lectures_delete"
  ON public.daily_lectures FOR DELETE TO public
  USING (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = daily_lectures.teacher_id LIMIT 1),
    school_id));


-- ---- teacher_assignments (resolve via teachers.branch_id) ----
DROP POLICY IF EXISTS "teacher_assignments_admin_manage_policy" ON public.teacher_assignments;

CREATE POLICY "teacher_assignments_select"
  ON public.teacher_assignments FOR SELECT TO authenticated
  USING (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = teacher_assignments.teacher_id LIMIT 1),
    school_id));

CREATE POLICY "teacher_assignments_insert"
  ON public.teacher_assignments FOR INSERT TO authenticated
  WITH CHECK (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = teacher_assignments.teacher_id LIMIT 1),
    school_id));

CREATE POLICY "teacher_assignments_update"
  ON public.teacher_assignments FOR UPDATE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = teacher_assignments.teacher_id LIMIT 1),
    school_id))
  WITH CHECK (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = teacher_assignments.teacher_id LIMIT 1),
    school_id));

CREATE POLICY "teacher_assignments_delete"
  ON public.teacher_assignments FOR DELETE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT t.branch_id FROM public.teachers t WHERE t.id = teacher_assignments.teacher_id LIMIT 1),
    school_id));


-- ---- grade_entries (resolve via students.branch_id) ----
DROP POLICY IF EXISTS "grade_entries_admin_manage_policy" ON public.grade_entries;

CREATE POLICY "grade_entries_select"
  ON public.grade_entries FOR SELECT TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = grade_entries.student_id LIMIT 1),
    school_id));

CREATE POLICY "grade_entries_insert"
  ON public.grade_entries FOR INSERT TO authenticated
  WITH CHECK (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = grade_entries.student_id LIMIT 1),
    school_id));

CREATE POLICY "grade_entries_update"
  ON public.grade_entries FOR UPDATE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = grade_entries.student_id LIMIT 1),
    school_id))
  WITH CHECK (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = grade_entries.student_id LIMIT 1),
    school_id));

CREATE POLICY "grade_entries_delete"
  ON public.grade_entries FOR DELETE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = grade_entries.student_id LIMIT 1),
    school_id));


-- ---- student_badges (resolve via students.branch_id) ----
DROP POLICY IF EXISTS "student_badges_admin_manage_policy" ON public.student_badges;

CREATE POLICY "student_badges_select"
  ON public.student_badges FOR SELECT TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_badges.student_id LIMIT 1),
    school_id));

CREATE POLICY "student_badges_insert"
  ON public.student_badges FOR INSERT TO authenticated
  WITH CHECK (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_badges.student_id LIMIT 1),
    school_id));

CREATE POLICY "student_badges_update"
  ON public.student_badges FOR UPDATE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_badges.student_id LIMIT 1),
    school_id))
  WITH CHECK (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_badges.student_id LIMIT 1),
    school_id));

CREATE POLICY "student_badges_delete"
  ON public.student_badges FOR DELETE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_badges.student_id LIMIT 1),
    school_id));


-- ---- student_goals (resolve via students.branch_id) ----
DROP POLICY IF EXISTS "student_goals_admin_manage_policy" ON public.student_goals;

CREATE POLICY "student_goals_select"
  ON public.student_goals FOR SELECT TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_goals.student_id LIMIT 1),
    school_id));

CREATE POLICY "student_goals_insert"
  ON public.student_goals FOR INSERT TO authenticated
  WITH CHECK (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_goals.student_id LIMIT 1),
    school_id));

CREATE POLICY "student_goals_update"
  ON public.student_goals FOR UPDATE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_goals.student_id LIMIT 1),
    school_id))
  WITH CHECK (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_goals.student_id LIMIT 1),
    school_id));

CREATE POLICY "student_goals_delete"
  ON public.student_goals FOR DELETE TO authenticated
  USING (current_user_can_access_branch(
    (SELECT s.branch_id FROM public.students s WHERE s.id = student_goals.student_id LIMIT 1),
    school_id));
