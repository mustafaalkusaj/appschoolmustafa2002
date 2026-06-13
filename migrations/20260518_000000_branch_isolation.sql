-- ============================================================
-- Migration: Branch Isolation
-- Date: 2026-05-18
-- Purpose:
--   1. Add branch_id to managed_user_profiles (denormalized from students/teachers)
--   2. Create current_managed_branch_id() SECURITY DEFINER function
--   3. Backfill branch_id from existing student/teacher records
--   4. Add branch-scoped RLS policies on attendance_records, assignments, grades
-- ============================================================

BEGIN;

-- --------------------------------------------------------
-- 1. Add branch_id to managed_user_profiles
-- --------------------------------------------------------

ALTER TABLE public.managed_user_profiles
  ADD COLUMN IF NOT EXISTS branch_id UUID NULL REFERENCES public.branches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_managed_user_profiles_branch_id
  ON public.managed_user_profiles(branch_id);

-- --------------------------------------------------------
-- 2. SECURITY DEFINER helper: current_managed_branch_id()
--    Returns the branch_id of the currently logged-in managed user.
--    Used in RLS policies to filter rows by branch without exposing
--    the managed_user_profiles table to row-level reads.
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_managed_branch_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT branch_id
  FROM public.managed_user_profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Grant execute to authenticated users (RLS policies call this)
GRANT EXECUTE ON FUNCTION public.current_managed_branch_id() TO authenticated;

-- --------------------------------------------------------
-- 3. Backfill branch_id from students and teachers
-- --------------------------------------------------------

-- Backfill from students (role = 'student')
UPDATE public.managed_user_profiles AS mup
SET branch_id = s.branch_id
FROM public.students AS s
WHERE mup.student_id = s.id
  AND mup.role = 'student'
  AND mup.branch_id IS NULL
  AND s.branch_id IS NOT NULL;

-- Backfill from teachers (role = 'teacher')
UPDATE public.managed_user_profiles AS mup
SET branch_id = t.branch_id
FROM public.teachers AS t
WHERE mup.teacher_id = t.id
  AND mup.role = 'teacher'
  AND mup.branch_id IS NULL
  AND t.branch_id IS NOT NULL;

-- --------------------------------------------------------
-- 4. Keep branch_id in sync via trigger
--    When student_id/teacher_id changes on managed_user_profiles,
--    automatically sync branch_id from the linked record.
-- --------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sync_managed_user_branch_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'student' AND NEW.student_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id
    FROM public.students
    WHERE id = NEW.student_id;
  ELSIF NEW.role = 'teacher' AND NEW.teacher_id IS NOT NULL THEN
    SELECT branch_id INTO NEW.branch_id
    FROM public.teachers
    WHERE id = NEW.teacher_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_managed_user_branch_id ON public.managed_user_profiles;
CREATE TRIGGER trg_sync_managed_user_branch_id
BEFORE INSERT OR UPDATE OF student_id, teacher_id ON public.managed_user_profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_managed_user_branch_id();

-- --------------------------------------------------------
-- 5. Branch-scoped RLS on attendance_records
--    Students only see attendance rows for their own branch.
--    Teachers see rows for their branch only.
--    Admins/super_admins bypass (handled by existing school-scope policy).
-- --------------------------------------------------------

-- Drop old student/teacher read policies if they exist without branch scope
DROP POLICY IF EXISTS attendance_records_student_read ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_teacher_read ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_student_branch_read ON public.attendance_records;
DROP POLICY IF EXISTS attendance_records_teacher_branch_read ON public.attendance_records;

-- Students: can read their own attendance (already scoped by student_id, branch adds defense-in-depth)
CREATE POLICY attendance_records_student_branch_read
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'student'
  AND student_id = public.current_managed_student_id()
  AND school_id = public.current_managed_school_id()
);

-- Teachers: can read attendance for their branch only
CREATE POLICY attendance_records_teacher_branch_read
ON public.attendance_records
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND (
    -- teacher has a branch → restrict to that branch
    public.current_managed_branch_id() IS NULL
    OR branch_id = public.current_managed_branch_id()
    OR branch_id IS NULL  -- records not yet assigned to a branch remain visible
  )
);

-- --------------------------------------------------------
-- 6. Branch-scoped RLS on assignments
-- --------------------------------------------------------

DROP POLICY IF EXISTS assignments_student_read ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_read ON public.assignments;
DROP POLICY IF EXISTS assignments_student_branch_read ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_branch_read ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_write ON public.assignments;
DROP POLICY IF EXISTS assignments_teacher_branch_write ON public.assignments;

-- Students: see assignments targeted to them or their class, within their school
CREATE POLICY assignments_student_branch_read
ON public.assignments
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'student'
  AND school_id = public.current_managed_school_id()
  AND (
    student_id = public.current_managed_student_id()
    OR student_id IS NULL  -- class-wide assignments
  )
  AND (
    public.current_managed_branch_id() IS NULL
    OR branch_id = public.current_managed_branch_id()
    OR branch_id IS NULL
  )
);

-- Teachers: read/write assignments within their branch
CREATE POLICY assignments_teacher_branch_read
ON public.assignments
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND (
    public.current_managed_branch_id() IS NULL
    OR branch_id = public.current_managed_branch_id()
    OR branch_id IS NULL
  )
);

CREATE POLICY assignments_teacher_branch_write
ON public.assignments
FOR ALL
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND teacher_id = public.current_managed_teacher_id()
  AND (
    public.current_managed_branch_id() IS NULL
    OR branch_id = public.current_managed_branch_id()
    OR branch_id IS NULL
  )
)
WITH CHECK (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND teacher_id = public.current_managed_teacher_id()
);

-- --------------------------------------------------------
-- 7. Branch-scoped RLS on grades
-- --------------------------------------------------------

DROP POLICY IF EXISTS grades_student_read ON public.grades;
DROP POLICY IF EXISTS grades_teacher_read ON public.grades;
DROP POLICY IF EXISTS grades_teacher_write ON public.grades;
DROP POLICY IF EXISTS grades_student_branch_read ON public.grades;
DROP POLICY IF EXISTS grades_teacher_branch_read ON public.grades;
DROP POLICY IF EXISTS grades_teacher_branch_write ON public.grades;

-- Students: see only their own grades
CREATE POLICY grades_student_branch_read
ON public.grades
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'student'
  AND student_id = public.current_managed_student_id()
  AND school_id = public.current_managed_school_id()
);

-- Teachers: see grades within their branch
CREATE POLICY grades_teacher_branch_read
ON public.grades
FOR SELECT
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND (
    public.current_managed_branch_id() IS NULL
    OR branch_id = public.current_managed_branch_id()
    OR branch_id IS NULL
  )
);

-- Teachers: write grades within their branch
CREATE POLICY grades_teacher_branch_write
ON public.grades
FOR ALL
TO authenticated
USING (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND teacher_id = public.current_managed_teacher_id()
  AND (
    public.current_managed_branch_id() IS NULL
    OR branch_id = public.current_managed_branch_id()
    OR branch_id IS NULL
  )
)
WITH CHECK (
  public.current_managed_role() = 'teacher'
  AND school_id = public.current_managed_school_id()
  AND teacher_id = public.current_managed_teacher_id()
);

COMMIT;
