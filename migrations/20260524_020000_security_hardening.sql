-- Revoke EXECUTE from anon role on sensitive SECURITY DEFINER functions
-- These were callable without authentication
REVOKE EXECUTE ON FUNCTION current_managed_branch_id() FROM anon;
REVOKE EXECUTE ON FUNCTION sync_managed_user_branch_id() FROM anon;

-- Performance index for daily_lectures (hot query path)
CREATE INDEX IF NOT EXISTS idx_daily_lectures_date_school
  ON daily_lectures (lecture_date, school_id);

-- Index for notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_school_created
  ON notifications (school_id, created_at DESC)
  WHERE deleted_at IS NULL;
