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
const STORE_CLEANUP_INTERVAL_MS = 60_000;
let lastCleanupAt = 0;

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

function buildRateLimitHeaders(record: RateLimitRecord, maxHits: number) {
  const remaining = Math.max(0, maxHits - record.count);
  const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - Date.now()) / 1000));

  return {
    "Retry-After": String(retryAfterSeconds),
    "X-RateLimit-Limit": String(maxHits),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(Math.ceil(record.resetAt / 1000)),
  };
}

export function enforceRateLimit(request: NextRequest, options: RateLimitOptions) {
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

  const response = NextResponse.json(
    {
      error: {
        message: "تم تجاوز الحد المسموح للطلبات. حاول مرة أخرى بعد قليل.",
      },
    },
    { status: 429 },
  );

  const headers = buildRateLimitHeaders(record, options.maxHits);
  Object.entries(headers).forEach(([name, value]) => {
    response.headers.set(name, value);
  });

  return response;
}
