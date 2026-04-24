/**
 * Rate limiting tests.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstashMocks = vi.hoisted(() => {
  const limit = vi.fn(async () => ({
    success: true,
    limit: 5,
    remaining: 4,
    reset: Date.now() + 60_000,
  }));
  const redisConstructor = vi.fn();
  const ratelimitConstructor = vi.fn(function Ratelimit(this: { limit: typeof limit }) {
    this.limit = limit;
  });
  const slidingWindow = vi.fn((requests: number, window: string) => ({ requests, window }));

  return {
    limit,
    redisConstructor,
    ratelimitConstructor,
    slidingWindow,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: upstashMocks.redisConstructor,
}));

vi.mock("@upstash/ratelimit", () => {
  upstashMocks.ratelimitConstructor.slidingWindow = upstashMocks.slidingWindow;

  return {
    Ratelimit: upstashMocks.ratelimitConstructor,
  };
});

function setNodeEnv(value: string) {
  vi.stubEnv("NODE_ENV", value);
}

async function importRateLimit() {
  vi.resetModules();
  return import("@/lib/rate-limit");
}

function request() {
  return new NextRequest("https://example.test/api", {
    headers: {
      "x-forwarded-for": "203.0.113.10",
    },
  });
}

describe("Rate Limiting", () => {
  const testClientId = "test-client-123";

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    setNodeEnv("test");
    upstashMocks.limit.mockClear();
    upstashMocks.redisConstructor.mockClear();
    upstashMocks.ratelimitConstructor.mockClear();
    upstashMocks.slidingWindow.mockClear();
    upstashMocks.limit.mockResolvedValue({
      success: true,
      limit: 5,
      remaining: 4,
      reset: Date.now() + 60_000,
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("development memory fallback", () => {
    it("allows first request", async () => {
      const { isWithinRateLimit, RATE_LIMIT_CONFIG, resetRateLimit } = await importRateLimit();
      resetRateLimit(testClientId);

      const result = isWithinRateLimit(testClientId, RATE_LIMIT_CONFIG.API_ENDPOINT);

      expect(result).toBe(true);
      expect(upstashMocks.redisConstructor).not.toHaveBeenCalled();
    });

    it("allows then denies after the configured memory limit", async () => {
      const { isWithinRateLimit, resetRateLimit } = await importRateLimit();
      const limit = { requests: 5, window: 60 };
      resetRateLimit(testClientId);

      for (let i = 0; i < 5; i++) {
        expect(isWithinRateLimit(testClientId, limit)).toBe(true);
      }

      expect(isWithinRateLimit(testClientId, limit)).toBe(false);
    });

    it("refills memory tokens after window time", async () => {
      vi.useFakeTimers();
      const { isWithinRateLimit, resetRateLimit } = await importRateLimit();
      const limit = { requests: 1, window: 1 };
      resetRateLimit(testClientId);

      expect(isWithinRateLimit(testClientId, limit)).toBe(true);
      expect(isWithinRateLimit(testClientId, limit)).toBe(false);

      vi.advanceTimersByTime(1100);

      expect(isWithinRateLimit(testClientId, limit)).toBe(true);
    });
  });

  describe("production configuration", () => {
    it("detects missing Upstash env in production", async () => {
      setNodeEnv("production");
      const { enforceRateLimit } = await importRateLimit();

      const response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
      });

      // Fails open in production (returns null = allow) to avoid blocking auth endpoints
      expect(response).toBeNull();
      expect(upstashMocks.redisConstructor).not.toHaveBeenCalled();
    });

    it("initializes Redis rate limiter when production Upstash env is present", async () => {
      setNodeEnv("production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      const { enforceRateLimit } = await importRateLimit();

      const response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
      });

      expect(response).toBeNull();
      expect(upstashMocks.redisConstructor).toHaveBeenCalledWith({
        url: "https://example-upstash.test",
        token: "test-token",
      });
      expect(upstashMocks.slidingWindow).toHaveBeenCalledWith(5, "60 s");
      expect(upstashMocks.limit).toHaveBeenCalledWith(testClientId);
    });

    it("returns the existing rate limit response shape when Redis denies", async () => {
      setNodeEnv("production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      upstashMocks.limit.mockResolvedValueOnce({
        success: false,
        limit: 5,
        remaining: 0,
        reset: Date.now() + 30_000,
      });
      const { enforceRateLimit } = await importRateLimit();

      const response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
      });

      expect(response?.status).toBe(429);
      expect(response?.headers.get("X-RateLimit-Limit")).toBe("5");
      expect(response?.headers.get("X-RateLimit-Remaining")).toBe("0");
      await expect(response?.json()).resolves.toEqual({
        error: {
          message: "تم تجاوز حد الطلبات المسموح. يرجى المحاولة لاحقاً.",
        },
      });
    });
  });
});
