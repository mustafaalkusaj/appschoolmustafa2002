/**
 * Rate Limiting Middleware
 * Implements token bucket algorithm for API rate limiting
 * Prevents abuse by limiting requests per IP/User
 */

import { NextRequest } from "next/server";

interface RateLimitStore {
  [key: string]: {
    tokens: number;
    lastRefill: number;
  };
}

// In-memory store for rate limit tokens
// In production, this should use Redis
const store: RateLimitStore = {};

/**
 * Configuration for rate limiting
 */
export const RATE_LIMIT_CONFIG = {
  // Global rate limits (per minute)
  GLOBAL: {
    requests: 1000,
    window: 60, // seconds
  },
  // API endpoint limits
  API_ENDPOINT: {
    requests: 100,
    window: 60, // requests per minute
  },
  // Super admin operations (more lenient)
  SUPER_ADMIN: {
    requests: 500,
    window: 60,
  },
  // Auth endpoints (stricter)
  AUTH: {
    requests: 20,
    window: 60,
  },
  // File upload limits
  FILE_UPLOAD: {
    requests: 10,
    window: 300, // 5 minutes
  },
};

/**
 * Extract client identifier (IP or user ID)
 */
function getClientId(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const userId = req.headers.get("x-user-id") || "anonymous";
  return `${ip}:${userId}`;
}

/**
 * Check if request is within rate limit
 * Uses token bucket algorithm
 */
export function isWithinRateLimit(
  clientId: string,
  config: { requests: number; window: number }
): boolean {
  const now = Date.now() / 1000;
  const bucket = store[clientId];

  // Initialize new bucket
  if (!bucket) {
    store[clientId] = {
      tokens: config.requests,
      lastRefill: now,
    };
    return true;
  }

  // Refill tokens based on elapsed time
  const timePassed = now - bucket.lastRefill;
  const tokensToAdd = (timePassed / config.window) * config.requests;

  bucket.tokens = Math.min(
    config.requests,
    bucket.tokens + tokensToAdd
  );
  bucket.lastRefill = now;

  // Check if we have tokens available
  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return true;
  }

  return false;
}

/**
 * Middleware for rate limiting
 * Use this in API routes to enforce rate limits
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  limits: typeof RATE_LIMIT_CONFIG[keyof typeof RATE_LIMIT_CONFIG] = RATE_LIMIT_CONFIG.API_ENDPOINT
): Promise<{ ok: boolean; clientId: string; status?: number; message?: string }> {
  const clientId = getClientId(req);

  if (!isWithinRateLimit(clientId, limits)) {
    return {
      ok: false,
      clientId,
      status: 429, // Too Many Requests
      message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.",
    };
  }

  return {
    ok: true,
    clientId,
  };
}

/**
 * Get current rate limit status for debugging
 */
export function getRateLimitStatus(clientId: string) {
  return store[clientId] || null;
}

/**
 * Reset rate limits for a specific client (admin only)
 */
export function resetRateLimit(clientId: string) {
  delete store[clientId];
}

/**
 * Cleanup old entries (call periodically)
 * Prevents memory leaks in long-running processes
 */
export function cleanupRateLimits() {
  const now = Date.now() / 1000;
  const maxAge = 3600; // 1 hour

  for (const clientId in store) {
    if (now - store[clientId].lastRefill > maxAge) {
      delete store[clientId];
    }
  }
}

// Run cleanup every 10 minutes
if (typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 10 * 60 * 1000);
}

/**
 * Get client IP from request (for compatibility)
 */
export function getRateLimitClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "unknown";
}

/**
 * Type definitions for enforceRateLimit
 */
export type RateLimitOptions = {
  namespace: string;
  windowMs: number;
  maxHits: number;
  identifier?: string | null;
};

/**
 * Enforce rate limit (compatible with existing code)
 * Returns null if request is allowed, or Response if rate limited
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions
): Promise<Response | null> {
  const clientId = options.identifier || getRateLimitClientIp(req);
  const config = { requests: options.maxHits, window: Math.ceil(options.windowMs / 1000) };

  if (!isWithinRateLimit(clientId, config)) {
    const bucket = store[clientId];
    const retryAfter = bucket ? Math.ceil(config.window - (Date.now() / 1000 - bucket.lastRefill)) : config.window;

    return new Response(
      JSON.stringify({
        error: {
          message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.",
        },
      }),
      {
        status: 429,
        headers: {
          "Retry-After": String(Math.max(1, retryAfter)),
          "X-RateLimit-Limit": String(config.requests),
          "X-RateLimit-Remaining": "0",
          "Content-Type": "application/json",
        },
      }
    );
  }

  return null;
}
