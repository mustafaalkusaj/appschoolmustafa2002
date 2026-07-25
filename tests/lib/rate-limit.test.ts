/**
 * Rate limiting tests.
 */

import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstashMocks = vi.hoisted(() => {
  const incr = vi.fn(async () => 1);
  const expire = vi.fn(async () => 1);
  const ttl = vi.fn(async () => 60);
  const redisConstructor = vi.fn(function Redis(this: {
    incr: typeof incr;
    expire: typeof expire;
    ttl: typeof ttl;
  }) {
    this.incr = incr;
    this.expire = expire;
    this.ttl = ttl;
  });

  return {
    incr,
    expire,
    ttl,
    redisConstructor,
  };
});

vi.mock("@upstash/redis", () => ({
  Redis: upstashMocks.redisConstructor,
}));

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
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let consoleWarnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.useRealTimers();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    setNodeEnv("test");
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    upstashMocks.incr.mockClear();
    upstashMocks.expire.mockClear();
    upstashMocks.ttl.mockClear();
    upstashMocks.redisConstructor.mockClear();
    upstashMocks.redisConstructor.mockImplementation(function Redis(this: {
      incr: typeof upstashMocks.incr;
      expire: typeof upstashMocks.expire;
      ttl: typeof upstashMocks.ttl;
    }) {
      this.incr = upstashMocks.incr;
      this.expire = upstashMocks.expire;
      this.ttl = upstashMocks.ttl;
    });
    upstashMocks.incr.mockResolvedValue(1);
    upstashMocks.expire.mockResolvedValue(1);
    upstashMocks.ttl.mockResolvedValue(60);
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  describe("development memory fallback", () => {
    it("allows first request", async () => {
      const { isWithinRateLimit, RATE_LIMIT_CONFIG, resetRateLimit } =
        await importRateLimit();
      resetRateLimit(testClientId);

      const result = isWithinRateLimit(
        testClientId,
        RATE_LIMIT_CONFIG.API_ENDPOINT,
      );

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
    it("falls back to in-memory throttling for auth-login when Upstash config is missing in production", async () => {
      setNodeEnv("production");
      const { enforceRateLimit, resetRateLimit } = await importRateLimit();
      resetRateLimit(testClientId);

      let response: Response | null = null;
      for (let i = 0; i < 5; i += 1) {
        response = await enforceRateLimit(request(), {
          namespace: "auth-login",
          windowMs: 60_000,
          maxHits: 5,
          identifier: testClientId,
          productionFailureMode: "memory-fallback",
          onRateLimited: {
            error: "too_many_attempts",
            message: "محاولات كثيرة، حاول لاحقاً",
          },
        });
        expect(response).toBeNull();
      }

      response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
        productionFailureMode: "memory-fallback",
        onRateLimited: {
          error: "too_many_attempts",
          message: "محاولات كثيرة، حاول لاحقاً",
        },
      });

      expect(response?.status).toBe(429);
      expect(upstashMocks.redisConstructor).not.toHaveBeenCalled();
      await expect(response?.json()).resolves.toEqual({
        error: "too_many_attempts",
        message: "محاولات كثيرة، حاول لاحقاً",
      });
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Production rate limiting backend failed for namespace="auth-login" reason="missing-config".',
        ),
      );
    });

    it("keeps fail-open available for non-critical endpoints in production when configured that way", async () => {
      setNodeEnv("production");
      const { enforceRateLimit } = await importRateLimit();

      const response = await enforceRateLimit(request(), {
        namespace: "ops-client-error",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
      });

      expect(response).toBeNull();
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
      expect(upstashMocks.incr).toHaveBeenCalledWith(
        expect.stringContaining(`:${testClientId}`),
      );
      expect(upstashMocks.expire).toHaveBeenCalledTimes(1);
    });

    it("returns 429 when Redis counter exceeds the configured limit", async () => {
      setNodeEnv("production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      upstashMocks.incr.mockResolvedValueOnce(6);
      upstashMocks.ttl.mockResolvedValueOnce(30);
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

    it("falls back to in-memory throttling for auth-login when Redis client init throws", async () => {
      setNodeEnv("production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      const initError = new Error("redis init failed");
      upstashMocks.redisConstructor.mockImplementation(function Redis() {
        throw initError;
      });
      const { enforceRateLimit, resetRateLimit } = await importRateLimit();
      resetRateLimit(testClientId);

      let response: Response | null = null;
      for (let i = 0; i < 5; i += 1) {
        response = await enforceRateLimit(request(), {
          namespace: "auth-login",
          windowMs: 60_000,
          maxHits: 5,
          identifier: testClientId,
          productionFailureMode: "memory-fallback",
          onRateLimited: {
            error: "too_many_attempts",
            message: "محاولات كثيرة، حاول لاحقاً",
          },
        });
        expect(response).toBeNull();
      }

      response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
        productionFailureMode: "memory-fallback",
        onRateLimited: {
          error: "too_many_attempts",
          message: "محاولات كثيرة، حاول لاحقاً",
        },
      });

      expect(response?.status).toBe(429);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Production rate limiting backend failed for namespace="auth-login" reason="init-error".',
        ),
        initError,
      );
    });

    it("falls back to in-memory throttling for auth-login when Redis limit calls throw", async () => {
      setNodeEnv("production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      const runtimeError = new Error("redis request failed");
      upstashMocks.incr.mockRejectedValue(runtimeError);
      const { enforceRateLimit, resetRateLimit } = await importRateLimit();
      resetRateLimit(testClientId);

      let response: Response | null = null;
      for (let i = 0; i < 5; i += 1) {
        response = await enforceRateLimit(request(), {
          namespace: "auth-login",
          windowMs: 60_000,
          maxHits: 5,
          identifier: testClientId,
          productionFailureMode: "memory-fallback",
          onRateLimited: {
            error: "too_many_attempts",
            message: "محاولات كثيرة، حاول لاحقاً",
          },
        });
        expect(response).toBeNull();
      }

      response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
        productionFailureMode: "memory-fallback",
        onRateLimited: {
          error: "too_many_attempts",
          message: "محاولات كثيرة، حاول لاحقاً",
        },
      });

      expect(response?.status).toBe(429);
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining(
          'Production rate limiting backend failed for namespace="auth-login" reason="runtime-error".',
        ),
        runtimeError,
      );
    });
  });

  describe("auth login identifiers", () => {
    it("builds a safe identifier from IP and normalized email", async () => {
      const { buildAuthRateLimitIdentifier } = await importRateLimit();

      const identifier = buildAuthRateLimitIdentifier(
        request(),
        " User@example.com ",
      );

      expect(identifier).toMatch(/^203\.0\.113\.10:[a-f0-9]{24}$/);
      expect(identifier).not.toContain("User@example.com");
      expect(identifier).not.toContain("user@example.com");
    });

    it("uses TTL to determine retry-after for Redis-backed fixed-window throttling", async () => {
      setNodeEnv("production");
      vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://example-upstash.test");
      vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-token");
      upstashMocks.incr.mockResolvedValueOnce(6);
      upstashMocks.ttl.mockResolvedValueOnce(17);
      const { enforceRateLimit } = await importRateLimit();

      const response = await enforceRateLimit(request(), {
        namespace: "auth-login",
        windowMs: 60_000,
        maxHits: 5,
        identifier: testClientId,
      });

      expect(response?.status).toBe(429);
      expect(response?.headers.get("Retry-After")).toBe("17");
    });
  });
});
