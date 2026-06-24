CREATE TABLE IF NOT EXISTS assignment_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  assignment_id UUID NOT NULL,
  student_id UUID NOT NULL,
  notes TEXT,
  file_url TEXT,
  file_name TEXT,
  file_mime_type TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assignment_submissions_unique UNIQUE (assignment_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_asub_school_student ON assignment_submissions(school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_asub_assignment ON assignment_submissions(assignment_id);

ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
-- service role bypasses RLS (used by our API)
