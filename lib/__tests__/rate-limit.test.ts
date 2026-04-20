/**
 * Rate Limiting Tests
 * Tests the token bucket algorithm and rate limiting logic
 */

import { isWithinRateLimit, RATE_LIMIT_CONFIG, resetRateLimit } from "../rate-limit";

describe("Rate Limiting", () => {
  const testClientId = "test-client-123";

  beforeEach(() => {
    resetRateLimit(testClientId);
  });

  describe("isWithinRateLimit", () => {
    it("should allow first request", () => {
      const result = isWithinRateLimit(testClientId, RATE_LIMIT_CONFIG.API_ENDPOINT);
      expect(result).toBe(true);
    });

    it("should allow multiple requests within limit", () => {
      const limit = { requests: 5, window: 60 };
      
      for (let i = 0; i < 5; i++) {
        const result = isWithinRateLimit(testClientId, limit);
        expect(result).toBe(true);
      }
      
      const result = isWithinRateLimit(testClientId, limit);
      expect(result).toBe(false);
    });

    it("should refill tokens after window time", async () => {
      const limit = { requests: 1, window: 1 };
      
      let result = isWithinRateLimit(testClientId, limit);
      expect(result).toBe(true);
      
      result = isWithinRateLimit(testClientId, limit);
      expect(result).toBe(false);
      
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      result = isWithinRateLimit(testClientId, limit);
      expect(result).toBe(true);
    });
  });
});
