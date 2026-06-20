-- CRITICAL FIX: managed_user_credentials used SHA-256 for password hashing.
-- SHA-256 is a fast hash — brute-forceable in minutes with GPU.
-- Switch to bcrypt (pgcrypto). Force password reset for all existing SHA-256 hashes
-- since SHA-256 → bcrypt rehash is impossible (one-way function).
--
-- Application impact:
--   Password verification must change from:
--     encode(sha256(input::bytea), 'hex') = stored_hash
--   To:
--     crypt(input, stored_hash) = stored_hash
--
-- New password storage:
--     crypt(password, gen_salt('bf', 10))

BEGIN;

-- Ensure pgcrypto is available (already required for gen_random_uuid in most migrations)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add column to track hash algorithm used — enables gradual migration
ALTER TABLE managed_user_credentials
  ADD COLUMN IF NOT EXISTS password_hash_algorithm TEXT NOT NULL DEFAULT 'sha256'
  CHECK (password_hash_algorithm IN ('sha256', 'bcrypt'));

-- Mark all existing hashes as sha256 (legacy)
UPDATE managed_user_credentials
SET password_hash_algorithm = 'sha256'
WHERE temporary_password_hash IS NOT NULL;

-- Force password reset for all sha256-hashed accounts.
-- These users will be prompted to set a new password on next login.
-- The application MUST check has_pending_setup = true and enforce reset before granting access.
UPDATE managed_user_credentials
SET has_pending_setup = true,
    -- Null out the sha256 hash — do not leave it in place as it is insecure
    temporary_password_hash = NULL,
    password_hash_algorithm = 'bcrypt'
WHERE password_hash_algorithm = 'sha256'
  AND temporary_password_hash IS NOT NULL;

-- Add comment documenting the expected application-side bcrypt usage
COMMENT ON COLUMN managed_user_credentials.temporary_password_hash IS
  'bcrypt hash of temporary password. Store using: crypt(password, gen_salt(''bf'', 10)). Verify using: crypt(input, stored_hash) = stored_hash. Never use sha256 or md5.';

COMMENT ON COLUMN managed_user_credentials.password_hash_algorithm IS
  'Algorithm used for temporary_password_hash. Must always be ''bcrypt'' for new records. ''sha256'' values indicate legacy hashes that have been cleared and require password reset.';

COMMIT;
