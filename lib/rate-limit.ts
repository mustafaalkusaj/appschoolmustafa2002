import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

type RateLimitRecord = {
  count: number;
  resetAt: number;
};

type RateLimitOptions = {
  namespace: string;
  windowMs: number;
  maxHits: number;
  identifier?: string | null;
};

const rateLimitStore = new Map<string, RateLimitRecord>();
const distributedLimiterStore = new Map<string, Ratelimit>();
const STORE_CLEANUP_INTERVAL_MS = 60_000;
let lastCleanupAt = 0;
let distributedRedisClient: Redis | null | undefined;
let distributedLimiterDisabled = false;

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  return "unknown";
}

export function getRateLimitClientIp(request: NextRequest) {
  return getClientIp(request);
}

function cleanupExpiredRecords(now: number) {
  if (now - lastCleanupAt < STORE_CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  rateLimitStore.forEach((value, key) => {
    if (value.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  });
}

function buildRateLimitKey(request: NextRequest, options: RateLimitOptions) {
  const identifier = options.identifier?.trim() || getClientIp(request);

  return `${options.namespace}:${identifier}`;
}

function buildRateLimitHeaders(input: { limit: number; remaining: number; reset: number }) {
  const retryAfterSeconds = Math.max(1, Math.ceil((input.reset - Date.now()) / 1000));

  return {
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(input.limit),
    "X-RateLimit-Remaining": String(Math.max(0, input.remaining)),
    "X-RateLimit-Reset": String(Math.ceil(input.reset / 1000)),
  };
}

function getDistributedRedisClient() {
  if (distributedRedisClient !== undefined) {
    return distributedRedisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    distributedRedisClient = null;
    return distributedRedisClient;
  }

  distributedRedisClient = new Redis({
    url,
    token,
  });

  return distributedRedisClient;
}

function getDistributedRateLimiter(options: RateLimitOptions) {
  if (distributedLimiterDisabled) {
    return null;
  }

  const redis = getDistributedRedisClient();
  if (!redis) {
    return null;
  }

  const key = `${options.windowMs}:${options.maxHits}`;
  const cached = distributedLimiterStore.get(key);
  if (cached) {
    return cached;
  }

  const limiter = new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(options.maxHits, `${options.windowMs} ms`),
    analytics: false,
    ephemeralCache: new Map<string, number>(),
    prefix: "school-app:ratelimit",
    timeout: 5_000,
  });

  distributedLimiterStore.set(key, limiter);
  return limiter;
}

function buildRateLimitResponse(headersInput: { limit: number; remaining: number; reset: number }) {
  const response = NextResponse.json(
    {
      error: {
        message: "تم تجاوز الحد المسموح للطلبات. حاول مرة أخرى بعد قليل.",
      },
    },
    { status: 429 },
  );

  const headers = buildRateLimitHeaders(headersInput);
  Object.entries(headers).forEach(([name, value]) => {
    response.headers.set(name, value);
  });

  return response;
}

function enforceLocalRateLimit(request: NextRequest, options: RateLimitOptions) {
  const now = Date.now();
  cleanupExpiredRecords(now);

  const key = buildRateLimitKey(request, options);
  const current = rateLimitStore.get(key);
  const record =
    current && current.resetAt > now
      ? current
      : {
          count: 0,
          resetAt: now + options.windowMs,
        };

  record.count += 1;
  rateLimitStore.set(key, record);

  if (record.count <= options.maxHits) {
    return null;
  }

  return buildRateLimitResponse({
    limit: options.maxHits,
    remaining: Math.max(0, options.maxHits - record.count),
    reset: record.resetAt,
  });
}

export async function enforceRateLimit(request: NextRequest, options: RateLimitOptions) {
  const distributedLimiter = getDistributedRateLimiter(options);
  if (!distributedLimiter) {
    return enforceLocalRateLimit(request, options);
  }

  try {
    const key = buildRateLimitKey(request, options);
    const result = await distributedLimiter.limit(key);
    await result.pending.catch(() => undefined);

    if (result.success) {
      return null;
    }

    return buildRateLimitResponse({
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[rate-limit] Falling back to local store after distributed limiter failure.", error);
    }
    distributedLimiterDisabled = true;
    return enforceLocalRateLimit(request, options);
  }
}
