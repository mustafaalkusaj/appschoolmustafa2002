/**
 * Rate limiting helpers for API routes.
 *
 * Production uses Upstash Redis so limits are shared across serverless
 * instances. The in-memory store below is intentionally development-only and
 * is not safe for Vercel, Lambda, or horizontally scaled deployments.
 */

import { Redis } from "@upstash/redis";
import { NextRequest } from "next/server";
import { createHash } from "node:crypto";

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

type ProductionFailureReason = "missing-config" | "init-error" | "runtime-error";
type ProductionFailureMode = "fail-open" | "fail-closed" | "memory-fallback";

// Development-only memory store. It is not shared across serverless instances.
const store: RateLimitStore = {};
let redisClient: Redis | null = null;
let hasLoggedMissingProductionConfig = false;
const rateLimitFailureLogKeys = new Set<string>();
export const RATE_LIMIT_FAIL_OPEN_TODO = "Replace fail-open with alert-backed resilient limiter before high traffic";
const DEFAULT_RATE_LIMIT_ERROR_MESSAGE = "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.";

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
  return Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim());
}

function getUpstashConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim() || "";
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim() || "";
  return { url, token };
}

function getRedisClient() {
  if (!hasUpstashConfig()) {
    return null;
  }

  const { url, token } = getUpstashConfig();

  redisClient ??= new Redis({
    url,
    token,
  });

  return redisClient;
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

function logProductionRateLimitBackendFailure(namespace: string, reason: ProductionFailureReason, error?: unknown) {
  const logKey = `${namespace}:${reason}`;
  if (rateLimitFailureLogKeys.has(logKey)) {
    return;
  }

  rateLimitFailureLogKeys.add(logKey);

  const baseMessage = `Production rate limiting backend failed for namespace="${namespace}" reason="${reason}". TODO: ${RATE_LIMIT_FAIL_OPEN_TODO}.`;
  if (error) {
    console.error(baseMessage, error);
    return;
  }

  console.error(baseMessage);
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
        message: DEFAULT_RATE_LIMIT_ERROR_MESSAGE,
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
): Promise<RateLimitDecision | { productionFailure: ProductionFailureReason }> {
  let redis: Redis | null = null;
  try {
    redis = getRedisClient();
  } catch (error) {
    if (isProduction()) {
      logProductionRateLimitBackendFailure(namespace, "init-error", error);
      return { productionFailure: "init-error" };
    }
  }

  if (redis) {
    try {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const windowBucket = Math.floor(nowSeconds / config.window);
      const key = `school-app:rate-limit:${namespace}:${windowBucket}:${clientId}`;
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.expire(key, config.window);
      }

      const ttl = await redis.ttl(key);
      const retryAfter = typeof ttl === "number" && ttl > 0 ? ttl : config.window;

      return {
        allowed: current <= config.requests,
        limit: config.requests,
        remaining: Math.max(0, config.requests - current),
        retryAfter,
      };
    } catch (error) {
      if (isProduction()) {
        logProductionRateLimitBackendFailure(namespace, "runtime-error", error);
        return { productionFailure: "runtime-error" };
      }
    }
  }

  if (isProduction()) {
    return { productionFailure: "missing-config" };
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

  if ("productionFailure" in decision) {
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

export function normalizeRateLimitEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() || null;
}

function hashRateLimitValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function buildAuthRateLimitIdentifier(req: NextRequest, email: string | null | undefined) {
  const normalizedEmail = normalizeRateLimitEmail(email);
  const ip = getRateLimitClientIp(req) || "unknown";
  const emailHash = normalizedEmail ? hashRateLimitValue(normalizedEmail).slice(0, 24) : "anon";
  return `${ip}:${emailHash}`;
}

export function getRateLimitOpsSnapshot() {
  return {
    production: isProduction(),
    upstashConfigured: hasUpstashConfig(),
    failOpenEnabled: true,
    memoryFallbackNamespaces: ["auth-login"],
    todo: RATE_LIMIT_FAIL_OPEN_TODO,
  };
}

/**
 * Type definitions for enforceRateLimit
 */
export type RateLimitOptions = {
  namespace: string;
  windowMs: number;
  maxHits: number;
  identifier?: string | null;
  onRateLimited?: {
    error: string;
    message: string;
  };
  productionFailureMode?: ProductionFailureMode;
};

function buildCustomRateLimitedResponse(
  decision: RateLimitDecision,
  payload?: RateLimitOptions["onRateLimited"],
) {
  if (!payload) {
    return rateLimitedResponse(decision);
  }

  return new Response(
    JSON.stringify({
      error: payload.error,
      message: payload.message,
    }),
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.max(1, decision.retryAfter)),
        "X-RateLimit-Limit": String(decision.limit),
        "X-RateLimit-Remaining": String(Math.max(0, decision.remaining)),
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    },
  );
}

/**
 * Enforce rate limit (compatible with existing code)
 * Returns null if request is allowed, or Response if rate limited.
 * Never throws — production currently fails open to avoid blocking login if Redis is unavailable.
 */
export async function enforceRateLimit(
  req: NextRequest,
  options: RateLimitOptions,
): Promise<Response | null> {
  try {
    const clientId = options.identifier || getRateLimitClientIp(req);
    const config = { requests: options.maxHits, window: Math.ceil(options.windowMs / 1000) };
    const decision = await checkRateLimit(options.namespace, clientId, config);
    const productionFailureMode = options.productionFailureMode ?? "fail-open";

    if ("productionFailure" in decision) {
      if (isProduction()) {
        if (decision.productionFailure === "missing-config") {
          logProductionRateLimitBackendFailure(options.namespace, decision.productionFailure);
        }
        if (productionFailureMode === "memory-fallback") {
          const memoryDecision = isWithinMemoryRateLimit(clientId, config);
          if (!memoryDecision.allowed) {
            return buildCustomRateLimitedResponse(memoryDecision, options.onRateLimited);
          }
          return null;
        }
        if (productionFailureMode === "fail-closed") {
          return buildCustomRateLimitedResponse(
            {
              allowed: false,
              limit: config.requests,
              remaining: 0,
              retryAfter: config.window,
            },
            options.onRateLimited,
          );
        }
        return null;
      }
      return productionConfigurationResponse();
    }

    if (!decision.allowed) {
      return buildCustomRateLimitedResponse(decision, options.onRateLimited);
    }

    return null;
  } catch (error) {
    console.error(`enforceRateLimit threw unexpectedly for namespace="${options.namespace}".`, error);
    if (isProduction() && (options.productionFailureMode ?? "fail-open") === "fail-closed") {
      return buildCustomRateLimitedResponse(
        {
          allowed: false,
          limit: options.maxHits,
          remaining: 0,
          retryAfter: Math.ceil(options.windowMs / 1000),
        },
        options.onRateLimited,
      );
    }
    return null;
  }
}
