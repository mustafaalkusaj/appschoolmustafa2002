-- Add note and certificate_url to grade_entries
ALTER TABLE grade_entries
  ADD COLUMN IF NOT EXISTS note TEXT,
  ADD COLUMN IF NOT EXISTS certificate_url TEXT;
