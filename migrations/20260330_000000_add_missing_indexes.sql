-- Add missing indexes on foreign key columns for query performance
CREATE INDEX IF NOT EXISTS idx_students_school_id ON students(school_id);
CREATE INDEX IF NOT EXISTS idx_expenses_school_id ON expenses(school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);

-- Standardize cascade behavior: attendance_records.school_id
-- Changed from ON DELETE SET NULL to ON DELETE CASCADE to match other tenant-scoped tables
ALTER TABLE attendance_records DROP CONSTRAINT IF EXISTS attendance_records_school_id_fkey;
ALTER TABLE attendance_records ADD CONSTRAINT attendance_records_school_id_fkey 
  FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE;
