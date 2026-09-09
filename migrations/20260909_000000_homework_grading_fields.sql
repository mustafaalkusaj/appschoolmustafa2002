-- Homework/assignment grading support.
-- Additive only: extends the existing `assignments` and
-- `assignment_submissions` tables (see app/api/*/assignments routes).
-- Does NOT create new homework_* tables.

BEGIN;

ALTER TABLE assignments
  ADD COLUMN IF NOT EXISTS max_grade integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS allow_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active';

ALTER TABLE assignments
  DROP CONSTRAINT IF EXISTS assignments_status_check;

ALTER TABLE assignments
  ADD CONSTRAINT assignments_status_check
  CHECK (status IN ('active', 'closed', 'archived'));

ALTER TABLE assignment_submissions
  ADD COLUMN IF NOT EXISTS is_late boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS grade integer,
  ADD COLUMN IF NOT EXISTS feedback text,
  ADD COLUMN IF NOT EXISTS graded_at timestamptz,
  ADD COLUMN IF NOT EXISTS graded_by uuid,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'submitted';

ALTER TABLE assignment_submissions
  DROP CONSTRAINT IF EXISTS assignment_submissions_status_check;

ALTER TABLE assignment_submissions
  ADD CONSTRAINT assignment_submissions_status_check
  CHECK (status IN ('submitted', 'graded'));

COMMENT ON COLUMN assignments.max_grade IS
  'Maximum grade a submission for this assignment can receive. Defaults to 100.';
COMMENT ON COLUMN assignments.allow_late IS
  'Whether students may submit after due_at. When false, late submit attempts are rejected.';
COMMENT ON COLUMN assignment_submissions.is_late IS
  'Computed at submit time: true when submitted_at is after assignments.due_at.';
COMMENT ON COLUMN assignment_submissions.grade IS
  'Teacher-assigned grade, 0..assignments.max_grade. Null until graded.';
COMMENT ON COLUMN assignment_submissions.graded_by IS
  'auth.users id of the teacher who graded this submission.';

COMMIT;
