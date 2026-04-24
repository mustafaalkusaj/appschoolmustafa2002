/**
 * JWT Service
 * Handles JWT token generation, validation, and decoding
 * Uses standard JWT claims with custom school/branch context
 * Built with Node.js crypto for zero-dependency JWT handling
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface JWTPayload {
  userId: string;
  email: string;
  schoolId: string;
  branchId?: string;
  role: string;
  isSinglePageUser?: boolean;
  iat?: number;
  exp?: number;
}

let cachedJwtSecret: string | null = null;

function getJWTSecret(): string {
  if (cachedJwtSecret) {
    return cachedJwtSecret;
  }

  const secret = process.env.JWT_SECRET?.trim();

  if (!secret) {
    if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
      throw new Error(
        'FATAL: JWT_SECRET is not configured. Production requires a secure JWT secret. ' +
        'Set JWT_SECRET environment variable to a strong random string (minimum 32 characters).'
      );
    }
    // Development fallback (not secure for production)
    cachedJwtSecret = 'dev-only-insecure-jwt-secret-change-in-production';
  } else {
    if (secret.length < 32) {
      console.warn('[JWT] WARNING: JWT_SECRET is shorter than recommended 32 characters.');
    }
    cachedJwtSecret = secret;
  }

  return cachedJwtSecret;
}

const JWT_EXPIRES_IN_MS = parseInt(process.env.JWT_EXPIRES_IN_MS || '86400000', 10); // 24 hours default

/**
 * Base64URL encode
 */
function base64UrlEncode(buffer: Buffer | string): string {
  const encoded =
    typeof buffer === 'string'
      ? Buffer.from(buffer, 'utf-8').toString('base64')
      : buffer.toString('base64');

  return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): Buffer {
  let input = str.replace(/-/g, '+').replace(/_/g, '/');

  // Add padding if needed
  const padding = 4 - (input.length % 4);
  if (padding !== 4) {
    input += '='.repeat(padding);
  }

  return Buffer.from(input, 'base64');
}

/**
 * Sign JWT
 */
function signJwt(payload: JWTPayload, secret: string): string {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.floor(JWT_EXPIRES_IN_MS / 1000);

  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const jwtPayload = {
    ...payload,
    iat: now,
    exp
  };

  const headerEncoded = base64UrlEncode(JSON.stringify(header));
  const payloadEncoded = base64UrlEncode(JSON.stringify(jwtPayload));

  const message = `${headerEncoded}.${payloadEncoded}`;

  // Create HMAC signature
  const signature = createHmac('sha256', secret).update(message).digest();
  const signatureEncoded = base64UrlEncode(signature);

  return `${message}.${signatureEncoded}`;
}

/**
 * Verify JWT signature
 */
function verifyJwtSignature(token: string, secret: string): boolean {
  const parts = token.split('.');

  if (parts.length !== 3) {
    return false;
  }

  const [headerEncoded, payloadEncoded, signatureEncoded] = parts;
  const message = `${headerEncoded}.${payloadEncoded}`;

  // Recreate signature
  const signature = createHmac('sha256', secret).update(message).digest();
  const expectedSignatureEncoded = base64UrlEncode(signature);

  try {
    // Timing-safe comparison using Node.js crypto.timingSafeEqual
    const expectedBuffer = Buffer.from(expectedSignatureEncoded, 'utf-8');
    const providedBuffer = Buffer.from(signatureEncoded, 'utf-8');

    return timingSafeEqual(expectedBuffer, providedBuffer);
  } catch {
    // Buffer lengths don't match - use constant-time comparison
    return false;
  }
}

/**
 * Decode JWT payload
 */
function decodeJwtPayload(token: string): any | null {
  try {
    const parts = token.split('.');

    if (parts.length !== 3) {
      return null;
    }

    const payloadBuffer = base64UrlDecode(parts[1]);
    return JSON.parse(payloadBuffer.toString('utf-8'));
  } catch {
    return null;
  }
}

/**
 * Generate a new JWT token
 */
export function generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  return signJwt(payload as JWTPayload, getJWTSecret());
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Verify signature
    if (!verifyJwtSignature(token, getJWTSecret())) {
      return null;
    }

    // Decode and check expiration
    const payload = decodeJwtPayload(token) as JWTPayload;

    if (!payload || !payload.exp) {
      return null;
    }

    // Check if expired
    const now = Math.floor(Date.now() / 1000);
    if (now > payload.exp) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Decode a JWT token without verification
 * Use only for inspection, not security-critical operations
 */
export function decodeToken(token: string): JWTPayload | null {
  try {
    return decodeJwtPayload(token) as JWTPayload | null;
  } catch {
    return null;
  }
}

/**
 * Extract token from Authorization header
 */
export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Check if token is expired
 */
export function isTokenExpired(token: string): boolean {
  const payload = decodeToken(token);
  if (!payload || !payload.exp) return true;

  return Date.now() >= payload.exp * 1000;
}

/**
 * Refresh a valid token
 */
export function refreshToken(token: string): string | null {
  const payload = verifyToken(token);
  if (!payload) return null;

  const { iat: _iat, exp: _exp, ...rest } = payload;
  return generateToken(rest);
}
