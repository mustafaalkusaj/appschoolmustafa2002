-- Add currency field to schools and branches
-- Defaults to IQD (Iraqi Dinar)

ALTER TABLE schools
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'IQD';

ALTER TABLE branches
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT NULL;

-- branches.currency = NULL means "inherit from school"
