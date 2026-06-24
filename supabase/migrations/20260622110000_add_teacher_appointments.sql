CREATE TABLE IF NOT EXISTS teacher_appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL,
  teacher_id UUID,
  parent_user_id UUID NOT NULL,
  student_id UUID NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  scheduled_at TIMESTAMPTZ,
  notes TEXT,
  parent_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tappt_school_teacher ON teacher_appointments(school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_tappt_parent ON teacher_appointments(parent_user_id);
ALTER TABLE teacher_appointments ENABLE ROW LEVEL SECURITY;
