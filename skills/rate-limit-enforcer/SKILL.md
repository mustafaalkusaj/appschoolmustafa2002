# Rate Limit Enforcer

## Name
rate-limit-enforcer

## Description
Implements rate limiting to protect APIs from abuse, prevent denial of service, and ensure fair resource allocation among users. Rate limiting controls how many requests a user or service can make in a given time window.

**When to use:**
- When protecting APIs from abuse or malicious usage
- When preventing brute force attacks on authentication endpoints
- When limiting resource-intensive operations
- When enforcing API tier limits (free vs paid plans)
- When protecting against unintentional DDoS (infinite loops, recursive calls)
- When you need to comply with third-party API rate limits

## Instructions

1. **Choose rate limit algorithm** - Fixed window, sliding window, token bucket, leaky bucket
2. **Define limit tiers** - Different limits for different user types/plans
3. **Select storage** - Redis (distributed), memory (single instance)
4. **Create middleware** - Intercept requests and enforce limits
5. **Handle limit exceeded** - Return appropriate error with retry info
6. **Add headers** - Include rate limit info in responses
7. **Configure per-endpoint limits** - Stricter limits for sensitive endpoints

## Expected Input

```javascript
{
  "algorithm": "sliding-window", // or "fixed-window", "token-bucket"
  "storage": "Redis",
  "tiers": [
    { "name": "anonymous", "requests": 100, "window": "1h" },
    { "name": "authenticated", "requests": 1000, "window": "1h" },
    { "name": "premium", "requests": 10000, "window": "1h" }
  ],
  "endpoints": [
    { "path": "/auth/*", "requests": 5, "window": "1m" },
    { "path": "/api/*", "requests": 100, "window": "1m" }
  ],
  "framework": "Express"
}
```

## Expected Output

```javascript
// Rate limiter middleware
{
  "headers": {
    "X-RateLimit-Limit": "100",
    "X-RateLimit-Remaining": "95",
    "X-RateLimit-Reset": "1623456789"
  },
  "response": {
    "status": 429,
    "body": { "error": "Too many requests", "retryAfter": 60 }
  }
}
```

## Example Usage

**Input:**
```
Implement rate limiting for an Express API with:
1. Global limit: 100 requests per minute per IP
2. Auth endpoints: 5 requests per minute per IP
3. API endpoints: 100 requests per minute per user
4. Use sliding window algorithm with Redis
5. Include rate limit headers in all responses
6. Return 429 with retry-after on limit exceeded
```

**Output:**
```typescript
// rate-limiter/index.ts
import Redis from 'ioredis';
import { redisConfig } from '../config/redis';
import { Request, Response, NextFunction } from 'express';

const redis = new Redis(redisConfig);

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: Request) => string;
  skip?: (req: Request) => boolean;
}

interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

// Sliding window rate limiter using Redis sorted sets
export class SlidingWindowRateLimiter {
  constructor(private config: RateLimitConfig) {}

  private getKey(req: Request): string {
    if (this.config.keyGenerator) {
      return this.config.keyGenerator(req);
    }
    const ip = req.ip || req.socket.remoteAddress;
    return `ratelimit:${ip}:${req.path}`;
  }

  async check(req: Request): Promise<RateLimitInfo> {
    const key = this.getKey(req);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    // Skip rate limiting for certain requests
    if (this.config.skip?.(req)) {
      return { limit: this.config.maxRequests, remaining: this.config.maxRequests, reset: now + this.config.windowMs };
    }

    const multi = redis.multi();
    
    // Remove old entries outside the window
    multi.zremrangebyscore(key, 0, windowStart);
    
    // Count current requests in window
    multi.zcard(key);
    
    // Add current request
    multi.zadd(key, now, `${now}-${Math.random()}`);
    
    // Set expiry on the key
    multi.expire(key, Math.ceil(this.config.windowMs / 1000));

    const results = await multi.exec();
    const currentCount = (results?.[1]?.[1] as number) || 0;

    const limit = this.config.maxRequests;
    const remaining = Math.max(0, limit - currentCount - 1);
    const reset = now + this.config.windowMs;

    return { limit, remaining, reset };
  }

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      try {
        const info = await this.check(req);

        // Set rate limit headers
        res.setHeader('X-RateLimit-Limit', info.limit);
        res.setHeader('X-RateLimit-Remaining', info.remaining);
        res.setHeader('X-RateLimit-Reset', Math.ceil(info.reset / 1000));

        if (info.remaining < 0) {
          const retryAfter = Math.ceil((info.reset - Date.now()) / 1000);
          res.setHeader('Retry-After', retryAfter);
          
          return res.status(429).json({
            success: false,
            error: {
              code: 'RATE_LIMIT_EXCEEDED',
              message: 'Too many requests, please try again later',
              retryAfter
            }
          });
        }

        next();
      } catch (error) {
        // If Redis fails, allow the request (fail open)
        console.error('Rate limiter error:', error);
        next();
      }
    };
  }
}

// Pre-configured rate limiters
export const rateLimiters = {
  global: new SlidingWindowRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => `ratelimit:ip:${req.ip}`
  }),

  auth: new SlidingWindowRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 5,
    keyGenerator: (req) => `ratelimit:auth:${req.ip}`
  }),

  api: new SlidingWindowRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyGenerator: (req) => `ratelimit:user:${req.user?.id || req.ip}`
  }),

  search: new SlidingWindowRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 30,
    keyGenerator: (req) => `ratelimit:search:${req.user?.id || req.ip}`
  }),

  upload: new SlidingWindowRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    keyGenerator: (req) => `ratelimit:upload:${req.user?.id || req.ip}`
  }),

  premium: new SlidingWindowRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1000,
    keyGenerator: (req) => `ratelimit:premium:${req.user?.id}`
  }),
};

// Tiered rate limiter
export class TieredRateLimiter {
  constructor(private limits: Record<string, { windowMs: number; max: number }>) {}

  middleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const userTier = req.user?.tier || 'free';
      const limit = this.limits[userTier] || this.limits['free'];

      const limiter = new SlidingWindowRateLimiter({
        windowMs: limit.windowMs,
        maxRequests: limit.max,
        keyGenerator: (req) => `ratelimit:tier:${userTier}:${req.user?.id || req.ip}`
      });

      return limiter.middleware()(req, res, next);
    };
  }
}

export const tieredLimiter = new TieredRateLimiter({
  free: { windowMs: 60 * 1000, max: 100 },
  basic: { windowMs: 60 * 1000, max: 500 },
  pro: { windowMs: 60 * 1000, max: 2000 },
  enterprise: { windowMs: 60 * 1000, max: 10000 }
});

// Usage in routes
app.use(rateLimiters.global.middleware());

app.post('/auth/login', rateLimiters.auth.middleware(), authController.login);
app.post('/auth/register', rateLimiters.auth.middleware(), authController.register);
app.post('/auth/forgot-password', rateLimiters.auth.middleware(), authController.forgotPassword);

app.use('/api', rateLimiters.api.middleware());

app.get('/search', rateLimiters.search.middleware(), searchController.search);

app.post('/upload', authenticate, rateLimiters.upload.middleware(), uploadController.upload);

// Tiered rate limiting for API routes
app.use('/api/v1', tieredLimiter.middleware(), apiController.handle);

// Custom rate limit with callback
export const customRateLimiter = (config: RateLimitConfig) => {
  const limiter = new SlidingWindowRateLimiter(config);
  return limiter.middleware();
};

// Usage with custom configuration
app.post('/webhooks/:provider', 
  customRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 10,
    keyGenerator: (req) => `ratelimit:webhook:${req.params.provider}`,
    skip: (req) => req.headers['x-api-key'] === process.env.WEBHOOK_SECRET
  }),
  webhookController.handle
);

// Rate limit status endpoint
app.get('/rate-limit-status', authenticate, async (req: Request, res: Response) => {
  const limiter = new SlidingWindowRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 100,
    keyGenerator: (req) => `ratelimit:user:${req.user.id}`
  });

  const info = await limiter.check(req);
  res.json({
    limit: info.limit,
    remaining: info.remaining,
    reset: new Date(info.reset * 1000).toISOString()
  });
});
```

## Rate Limit Algorithms

| Algorithm | Pros | Cons | Best For |
|-----------|------|------|----------|
| Fixed Window | Simple, low memory | Burst at window boundaries | Simple APIs |
| Sliding Window | Smooth limiting | More complex | Most use cases |
| Token Bucket | Allows bursts | Complex | API tiers |
| Leaky Bucket | Constant rate | No bursts | Rate enforcement |

## HTTP Headers

| Header | Description |
|--------|-------------|
| X-RateLimit-Limit | Max requests allowed |
| X-RateLimit-Remaining | Requests left in window |
| X-RateLimit-Reset | Unix timestamp when limit resets |
| Retry-After | Seconds to wait (on 429) |

## Best Practices

- **Fail open vs fail closed** - Consider failing open for non-critical APIs
- **Separate limits by endpoint** - Auth endpoints need stricter limits
- **Include user identity** - Authenticated users vs IP-based
- **Return useful headers** - Help clients manage their requests
- **Consider tiers** - Different limits for different plan levels
- **Graceful handling** - Informative 429 responses with retry info
- **Whitelist internal services** - Don't rate limit internal calls
- **Monitor and adjust** - Track usage patterns and tune limits
