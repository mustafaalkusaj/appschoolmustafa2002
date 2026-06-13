-- Per-teacher activity settings
ALTER TABLE teachers
  ADD COLUMN IF NOT EXISTS messaging_paused BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notifications_require_approval BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN teachers.messaging_paused IS 'When true, teacher cannot send new activities';
COMMENT ON COLUMN teachers.notifications_require_approval IS 'When true, notification-type activities go to pending status for admin approval';
