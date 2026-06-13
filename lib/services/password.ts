/**
 * Password Service
 * Handles password hashing and verification using bcrypt
 */

import crypto from 'crypto';

/**
 * Hash a password using PBKDF2
 * Falls back to Node.js crypto if bcrypt not available
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // Generate random salt
    const salt = crypto.randomBytes(16).toString('hex');

    // Use PBKDF2 for hashing
    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);

      // Return salt:hash format for storage
      const hash = derivedKey.toString('hex');
      resolve(`${salt}:${hash}`);
    });
  });
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const [salt, originalHash] = hash.split(':');

    if (!salt || !originalHash) {
      resolve(false);
      return;
    }

    crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
      if (err) reject(err);

      const newHash = derivedKey.toString('hex');
      const expectedBuf = Buffer.from(originalHash, 'utf-8');
      const actualBuf = Buffer.from(newHash, 'utf-8');

      if (expectedBuf.length !== actualBuf.length) {
        resolve(false);
        return;
      }

      try {
        resolve(crypto.timingSafeEqual(expectedBuf, actualBuf));
      } catch {
        resolve(false);
      }
    });
  });
}

/**
 * Generate a random temporary password
 */
export function generateTemporaryPassword(length: number = 12): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let password = '';

  for (let i = 0; i < length; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return password;
}

/**
 * Validate password strength
 */
export function validatePasswordStrength(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*)');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
