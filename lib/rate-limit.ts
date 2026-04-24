/**
 * Rate limiting helpers for API routes.
 *
 * Production uses Upstash Redis so limits are shared across serverless
 * instances. The in-memory store below is intentionally development-only and
 * is not safe for Vercel, Lambda, or horizontally scaled deployments.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";

interface RateLimitStore {
  [key: string]: {
    tokens: number;
    lastRefill: number;
  };
}

type RateLimitConfig = { requests: number; window: number };
type RateLimitDecision = {
  allowed: boolean;
  limit: number;
  remaining: number;
  retryAfter: number;
};

// Development-only memory store. It is not shared across serverless instances.
const store: RateLimitStore = {};
const redisRateLimiters = new Map<string, Ratelimit>();
let redisClient: Redis | null = null;
let hasLoggedMissingProductionConfig = false;
let hasLoggedRedisError = false;

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

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function hasUpstashConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function getRedisClient() {
  if (!hasUpstashConfig()) {
    return null;
  }

  redisClient ??= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  return redisClient;
}

function getRedisRateLimiter(namespace: string, config: RateLimitConfig) {
  const redis = getRedisClient();
  if (!redis) {
    return null;
  }

  const cacheKey = `${namespace}:${config.requests}:${config.window}`;
  let limiter = redisRateLimiters.get(cacheKey);

  if (!limiter) {
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(config.requests, `${config.window} s`),
      prefix: `school-app:rate-limit:${namespace}`,
      analytics: false,
    });
    redisRateLimiters.set(cacheKey, limiter);
  }

  return limiter;
}

function logMissingProductionConfig() {
  if (hasLoggedMissingProductionConfig) {
    return;
  }

  hasLoggedMissingProductionConfig = true;
  console.error(
    "Production rate limiting requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.",
  );
}

function productionConfigurationResponse() {
  logMissingProductionConfig();

  return new Response(
    JSON.stringify({
      error: {
        message: "Rate limiting is not configured for production.",
      },
    }),
    {
      status: 503,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": "application/json",
      },
    },
  );
}

function rateLimitedResponse(decision: RateLimitDecision) {
  return new Response(
    JSON.stringify({
      error: {
        message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.",
      },
    }),
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, decision.retryAfter)),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(Math.max(0, decision.remaining)),
        "Content-Type": "application/json",
      },
    },
  );
}

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
 * Development-only token bucket implementation.
 */
function isWithinMemoryRateLimit(clientId: string, config: RateLimitConfig): RateLimitDecision {
  const now = Date.now() / 1000;
  const bucket = store[clientId];

  if (!bucket) {
    store[clientId] = {
      tokens: config.requests - 1,
      lastRefill: now,
    };
    return {
      allowed: true,
      limit: config.requests,
      remaining: config.requests - 1,
      retryAfter: config.window,
    };
  }

  const timePassed = now - bucket.lastRefill;
  const tokensToAdd = (timePassed / config.window) * config.requests;

  bucket.tokens = Math.min(config.requests, bucket.tokens + tokensToAdd);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return {
      allowed: true,
      limit: config.requests,
      remaining: Math.floor(bucket.tokens),
      retryAfter: config.window,
    };
  }

  const secondsUntilNextToken = Math.ceil((1 - bucket.tokens) * (config.window / config.requests));
  return {
    allowed: false,
    limit: config.requests,
    remaining: 0,
    retryAfter: Math.max(1, secondsUntilNextToken),
  };
}

async function checkRateLimit(
  namespace: string,
  clientId: string,
  config: RateLimitConfig,
): Promise<RateLimitDecision | "production-config-missing"> {
  let limiter: Ratelimit | null = null;
  try {
    limiter = getRedisRateLimiter(namespace, config);
  } catch (error) {
    if (!hasLoggedRedisError) {
      hasLoggedRedisError = true;
      console.error("Redis rate limiter init failed.", error);
    }
    if (isProduction()) {
      return { allowed: true, limit: config.requests, remaining: config.requests - 1, retryAfter: config.window };
    }
  }

  if (limiter) {
    try {
      const result = await limiter.limit(clientId);
      return {
        allowed: result.success,
        limit: result.limit,
        remaining: result.remaining,
        retryAfter: Math.ceil(Math.max(0, result.reset - Date.now()) / 1000),
      };
    } catch (error) {
      if (!hasLoggedRedisError) {
        hasLoggedRedisError = true;
        console.error("Redis-backed rate limiting failed.", error);
      }

      if (isProduction()) {
        return {
          allowed: true,
          limit: config.requests,
          remaining: config.requests - 1,
          retryAfter: config.window,
        };
      }
    }
  }

  if (isProduction()) {
    return "production-config-missing";
  }

  return isWithinMemoryRateLimit(clientId, config);
}

/**
 * Check if request is within rate limit.
 *
 * This synchronous compatibility helper is development-only because production
 * rate limiting must use Redis-backed async storage.
 */
export function isWithinRateLimit(clientId: string, config: RateLimitConfig): boolean {
  if (isProduction()) {
    if (!hasUpstashConfig()) {
      logMissingProductionConfig();
    }
    throw new Error("Synchronous in-memory rate limiting is not allowed in production.");
  }

  return isWithinMemoryRateLimit(clientId, config).allowed;
}

/**
 * Middleware for rate limiting
 * Use this in API routes to enforce rate limits
 */
export async function rateLimitMiddleware(
  req: NextRequest,
  limits: (typeof RATE_LIMIT_CONFIG)[keyof typeof RATE_LIMIT_CONFIG] = RATE_LIMIT_CONFIG.API_ENDPOINT,
): Promise<{ ok: boolean; clientId: string; status?: number; message?: string }> {
  const clientId = getClientId(req);
  const decision = await checkRateLimit("middleware", clientId, limits);

  if (decision === "production-config-missing") {
    return {
      ok: false,
      clientId,
      status: 503,
      message: "Rate limiting is not configured for production.",
    };
  }

  if (!decision.allowed) {
    return {
      ok: false,
      clientId,
      status: 429,
      message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.",
    };
  }

  return {
    ok: true,
    clientId,
  };
}

/**
 * Get current development rate limit status for debugging.
 */
export function getRateLimitStatus(clientId: string) {
  return store[clientId] || null;
}

/**
 * Reset rate limits for a specific client in the development memory store.
 */
export function resetRateLimit(clientId: string) {
  delete store[clientId];
}

/**
 * Cleanup old development entries.
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

if (!isProduction() && typeof setInterval !== "undefined") {
  setInterval(cleanupRateLimits, 10 * 60 * 1000).unref?.();
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
 * Returns null if request is allowed, or Response if rate limited.
 * Never throws — fails open in production to avoid blocking auth endpoints.
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions,
): Promise<Response | null> {
  try {
    const clientId = options.identifier || getRateLimitClientIp(req);
    const config = { requests: options.maxHits, window: Math.ceil(options.windowMs / 1000) };
    const decision = await checkRateLimit(options.namespace, clientId, config);

    if (decision === "production-config-missing") {
      if (isProduction()) {
        console.error("Rate limiting not configured in production. Failing open.");
        return null;
      }
      return productionConfigurationResponse();
    }

    if (!decision.allowed) {
      return rateLimitedResponse(decision);
    }

    return null;
  } catch (error) {
    console.error("enforceRateLimit threw unexpectedly. Failing open.", error);
    return null;
  }
}
