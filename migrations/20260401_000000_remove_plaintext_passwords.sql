-- Remove plaintext temporary passwords and add hash-based verification
ALTER TABLE managed_user_credentials
  ADD COLUMN IF NOT EXISTS temporary_password_hash TEXT,
  ADD COLUMN IF NOT EXISTS has_pending_setup BOOLEAN NOT NULL DEFAULT false;

-- Migrate existing plaintext passwords to hashes (SHA-256)
UPDATE managed_user_credentials
SET temporary_password_hash = encode(sha256(temporary_password::bytea), 'hex'),
    has_pending_setup = true
WHERE temporary_password IS NOT NULL AND temporary_password != '';

-- Drop the plaintext column
ALTER TABLE managed_user_credentials
  DROP COLUMN IF EXISTS temporary_password;
