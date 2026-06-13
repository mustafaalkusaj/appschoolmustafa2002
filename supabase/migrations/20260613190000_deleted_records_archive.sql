-- Archive table: saves every deleted row automatically via DB trigger
-- Recovery: SELECT * FROM deleted_records_archive WHERE table_name = 'students' AND school_id = '...';

CREATE TABLE IF NOT EXISTS deleted_records_archive (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name    TEXT        NOT NULL,
  record_id     UUID        NOT NULL,
  school_id     UUID,
  data          JSONB       NOT NULL,
  deleted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dra_table_school ON deleted_records_archive(table_name, school_id);
CREATE INDEX IF NOT EXISTS idx_dra_record_id    ON deleted_records_archive(record_id);
CREATE INDEX IF NOT EXISTS idx_dra_deleted_at   ON deleted_records_archive(deleted_at DESC);

-- RLS: only service role can access archive
ALTER TABLE deleted_records_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_only" ON deleted_records_archive
  USING (auth.role() = 'service_role');

-- Trigger function: runs BEFORE DELETE on any critical table
CREATE OR REPLACE FUNCTION archive_before_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO deleted_records_archive (table_name, record_id, school_id, data)
  VALUES (
    TG_TABLE_NAME::TEXT,
    OLD.id,
    (OLD.school_id)::UUID,
    to_jsonb(OLD)
  );
  RETURN OLD;
END;
$$;

-- Apply to all critical tables
DROP TRIGGER IF EXISTS archive_students_delete   ON students;
DROP TRIGGER IF EXISTS archive_payments_delete   ON payments;
DROP TRIGGER IF EXISTS archive_grades_delete     ON grades;
DROP TRIGGER IF EXISTS archive_attendance_delete ON attendance;
DROP TRIGGER IF EXISTS archive_teachers_delete   ON teachers;

CREATE TRIGGER archive_students_delete
  BEFORE DELETE ON students
  FOR EACH ROW EXECUTE FUNCTION archive_before_delete();

CREATE TRIGGER archive_payments_delete
  BEFORE DELETE ON payments
  FOR EACH ROW EXECUTE FUNCTION archive_before_delete();

CREATE TRIGGER archive_grades_delete
  BEFORE DELETE ON grades
  FOR EACH ROW EXECUTE FUNCTION archive_before_delete();

CREATE TRIGGER archive_attendance_delete
  BEFORE DELETE ON attendance
  FOR EACH ROW EXECUTE FUNCTION archive_before_delete();

CREATE TRIGGER archive_teachers_delete
  BEFORE DELETE ON teachers
  FOR EACH ROW EXECUTE FUNCTION archive_before_delete();
