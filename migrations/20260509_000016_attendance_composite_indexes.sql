-- Fix upsert conflict key: promote unique constraint to include school_id
-- Old: UNIQUE (student_id, attendance_date)
-- New: UNIQUE (school_id, student_id, attendance_date) — semantically correct, same uniqueness in practice
ALTER TABLE public.attendance_records
  DROP CONSTRAINT IF EXISTS attendance_records_student_id_attendance_date_key;

ALTER TABLE public.attendance_records
  ADD CONSTRAINT attendance_records_school_student_date_key
  UNIQUE (school_id, student_id, attendance_date);

-- Composite indexes for high-traffic attendance_records queries
-- GET /api/web/attendance: filters by (school_id, attendance_date) — point lookup
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_date
  ON public.attendance_records (school_id, attendance_date);

-- 30-day history range scan + buildHistory grouping
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_date_status
  ON public.attendance_records (school_id, attendance_date, status);

-- repeated-absences: filters by (school_id, status='absent') then range on attendance_date
CREATE INDEX IF NOT EXISTS idx_attendance_records_school_status_date
  ON public.attendance_records (school_id, status, attendance_date);
