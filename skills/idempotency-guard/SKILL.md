# Idempotency Guard

## Name
idempotency-guard

## Description
Implements idempotency mechanisms to ensure that operations can be safely retried without causing duplicate effects. This is critical for payment processing, order creation, and any operation that should produce the same result regardless of how many times it's executed.

**When to use:**
- When processing payments or financial transactions
- When creating orders or reservations
- When integrating with external APIs that may retry requests
- When building systems with at-least-once delivery guarantees
- When implementing webhook handlers
- When creating any operation that should not produce duplicate side effects

## Instructions

1. **Define idempotency keys** - Unique identifiers passed by clients
2. **Choose storage** - Database or cache (Redis) for tracking processed keys
3. **Implement guard middleware** - Check if operation was already processed
4. **Handle result caching** - Store and return previous results
5. **Set expiration policies** - TTL for idempotency records
6. **Handle concurrent requests** - Lock or deduplicate simultaneous calls
7. **Add conflict detection** - Detect when same key has different payload

## Expected Input

```javascript
{
  "idempotencyKey": "x-idempotency-key", // Header name
  "storage": "Redis",
  "ttl": 86400, // 24 hours
  "strategies": {
    "payment": "result-cached",
    "order": "result-cached",
    "webhook": "result-cached"
  }
}
```

## Expected Output

```javascript
// Idempotency guard middleware
{
  "newRequest": {
    "status": 200,
    "body": { "id": "order-123", "status": "created" },
    "idempotencyKey": "stored"
  },
  "duplicateRequest": {
    "status": 200,
    "body": { "id": "order-123", "status": "created" }, // Same result
    "cached": true
  }
}
```

## Example Usage

**Input:**
```
Implement idempotency handling for an e-commerce API.
Operations: createOrder, processPayment, reserveInventory.
Use Redis to store idempotency keys with 24-hour TTL.
Cache operation results for duplicate requests.
Include conflict detection when same key is used with different payloads.
```

**Output:**
```typescript
// idempotency/index.ts
import { Request, Response, NextFunction } from 'express';
import { redis } from '../config/redis';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../utils/logger';

export interface IdempotencyRecord {
  key: string;
  status: 'processing' | 'completed' | 'failed';
  result?: any;
  resultStatus: number;
  createdAt: string;
  expiresAt: string;
  requestHash?: string;
}

export class IdempotencyGuard {
  constructor(
    private ttlSeconds: number = 86400,
    private keyHeader: string = 'x-idempotency-key'
  ) {}

  private getKey(req: Request): string {
    return req.headers[this.keyHeader] as string;
  }

  private getUserScope(req: Request): string {
    return req.user?.id || req.ip || 'anonymous';
  }

  private generateKey(key: string, scope: string): string {
    return `idempotency:${scope}:${key}`;
  }

  private hashPayload(payload: any): string {
    return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  async check(req: Request): Promise<{ isNew: boolean; record?: IdempotencyRecord }> {
    const idempotencyKey = this.getKey(req);
    
    if (!idempotencyKey) {
      return { isNew: true };
    }

    const scope = this.getUserScope(req);
    const key = this.generateKey(idempotencyKey, scope);
    
    const existing = await redis.get(key);
    
    if (existing) {
      const record = JSON.parse(existing) as IdempotencyRecord;
      
      // Check for payload conflict
      if (req.body && record.requestHash) {
        const currentHash = this.hashPayload(req.body);
        if (currentHash !== record.requestHash) {
          throw new IdempotencyConflictError(
            'Idempotency key reused with different payload'
          );
        }
      }
      
      return { isNew: false, record };
    }

    return { isNew: true };
  }

  async markProcessing(req: Request): Promise<string | null> {
    const idempotencyKey = this.getKey(req);
    if (!idempotencyKey) return null;

    const scope = this.getUserScope(req);
    const key = this.generateKey(idempotencyKey, scope);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

    const record: IdempotencyRecord = {
      key,
      status: 'processing',
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      requestHash: req.body ? this.hashPayload(req.body) : undefined
    };

    // Use NX to prevent race conditions
    const result = await redis.set(key, JSON.stringify(record), 'EX', this.ttlSeconds, 'NX');
    
    if (result === null) {
      // Another request is processing with same key
      return null;
    }

    return key;
  }

  async markCompleted(key: string, result: any, statusCode: number): Promise<void> {
    const existing = await redis.get(key);
    if (!existing) return;

    const record = JSON.parse(existing) as IdempotencyRecord;
    record.status = 'completed';
    record.result = result;
    record.resultStatus = statusCode;

    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(record), 'EX', ttl > 0 ? ttl : this.ttlSeconds);
  }

  async markFailed(key: string, error: any): Promise<void> {
    const existing = await redis.get(key);
    if (!existing) return;

    const record = JSON.parse(existing) as IdempotencyRecord;
    record.status = 'failed';
    record.result = { error: error.message };
    record.resultStatus = 500;

    const ttl = await redis.ttl(key);
    await redis.set(key, JSON.stringify(record), 'EX', ttl > 0 ? ttl : this.ttlSeconds);
  }
}

export class IdempotencyConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdempotencyConflictError';
  }
}

// Middleware factory
export const idempotencyMiddleware = (options: {
  ttlSeconds?: number;
  keyHeader?: string;
  skipMethods?: string[];
} = {}) => {
  const guard = new IdempotencyGuard(options.ttlSeconds, options.keyHeader);
  const skipMethods = options.skipMethods || ['GET', 'HEAD', 'OPTIONS'];

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip idempotency for certain methods
    if (skipMethods.includes(req.method)) {
      return next();
    }

    try {
      const check = await guard.check(req);

      if (!check.isNew && check.record) {
        // Return cached result for duplicate request
        logger.info('Returning cached idempotent result', {
          key: req.headers['x-idempotency-key']
        });

        res.setHeader('X-Idempotent-Replay', 'true');
        return res.status(check.record.resultStatus).json(check.record.result);
      }

      // Mark as processing
      const key = await guard.markProcessing(req);

      if (key === null) {
        // Another request is processing
        return res.status(409).json({
          success: false,
          error: {
            code: 'CONCURRENT_REQUEST',
            message: 'Another request with this idempotency key is being processed'
          }
        });
      }

      // Store key for later use in response handler
      req.idempotencyKey = key;

      // Wrap response methods to capture result
      const originalJson = res.json.bind(res);
      res.json = function(body: any) {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          guard.markCompleted(key, body, res.statusCode).catch(err => {
            logger.error('Failed to mark idempotency completed', { key, error: err });
          });
        }
        return originalJson(body);
      };

      next();
    } catch (error) {
      if (error instanceof IdempotencyConflictError) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'IDEMPOTENCY_CONFLICT',
            message: error.message
          }
        });
      }
      next(error);
    }
  };
};

// Service methods with built-in idempotency
export class IdempotentOrderService {
  constructor(
    private orderService: OrderService,
    private idempotencyGuard: IdempotencyGuard
  ) {}

  async createOrder(
    idempotencyKey: string,
    userId: string,
    items: OrderItem[],
    paymentMethodId: string
  ): Promise<Order> {
    // Check if already processed
    const check = await this.idempotencyGuard.check({ 
      headers: { 'x-idempotency-key': idempotencyKey },
      user: { id: userId }
    } as Request);

    if (!check.isNew && check.record?.result) {
      return check.record.result;
    }

    // Process the order
    const order = await this.orderService.create({ userId, items, paymentMethodId });
    
    return order;
  }

  async processPayment(
    idempotencyKey: string,
    orderId: string,
    amount: number
  ): Promise<PaymentResult> {
    const check = await this.idempotencyGuard.check({
      headers: { 'x-idempotency-key': idempotencyKey },
      user: {}
    } as Request);

    if (!check.isNew && check.record?.result) {
      return check.record.result;
    }

    const result = await paymentService.process(orderId, amount);
    
    return result;
  }
}

// Database-based idempotency (alternative to Redis)
export class DatabaseIdempotencyStore {
  constructor(private db: any) {}

  async isProcessed(key: string): Promise<boolean> {
    const record = await this.db.idempotency_records.findOne({ key });
    return record !== null && record.status === 'completed';
  }

  async getResult(key: string): Promise<any> {
    const record = await this.db.idempotency_records.findOne({ key });
    return record?.result;
  }

  async createRecord(key: string, payloadHash: string): Promise<boolean> {
    try {
      await this.db.idempotency_records.insert({
        key,
        payload_hash: payloadHash,
        status: 'processing',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 86400000)
      });
      return true;
    } catch (error) {
      if (error.code === 11000) {
        // Duplicate key
        return false;
      }
      throw error;
    }
  }

  async markCompleted(key: string, result: any): Promise<void> {
    await this.db.idempotency_records.updateOne(
      { key },
      { $set: { status: 'completed', result, completed_at: new Date() } }
    );
  }

  async markFailed(key: string, error: any): Promise<void> {
    await this.db.idempotency_records.updateOne(
      { key },
      { $set: { status: 'failed', error: error.message, failed_at: new Date() } }
    );
  }
}

// Usage in routes
router.post('/orders',
  idempotencyMiddleware({ ttlSeconds: 86400 }),
  orderController.create
);

router.post('/payments',
  idempotencyMiddleware({ ttlSeconds: 86400 }),
  paymentController.process
);

router.post('/reservations',
  idempotencyMiddleware({ ttlSeconds: 3600 }),
  reservationController.create
);

// Client-side usage example
// POST /api/orders
// Headers: { 'X-Idempotency-Key': 'order-attempt-abc123' }
// Body: { userId: 'user-123', items: [...] }
```

## Idempotency Patterns

| Pattern | Description | Use Case |
|---------|-------------|----------|
| Client-generated key | Client provides unique key | API consumers |
| Server-generated key | Server creates key, returns to client | Internal services |
| Result caching | Store and return previous result | GET-like operations |
| Deduplication | Check before processing | Database inserts |
| Conditional writes | Use unique constraints | Atomic operations |

## Best Practices

- **Unique keys per operation** - Each logical operation gets its own key
- **TTL management** - Keys should expire after reasonable time (24h typical)
- **Payload validation** - Detect when same key is reused with different data
- **Result caching** - Return previous result for duplicate requests
- **Lock for concurrent requests** - Prevent race conditions
- **Log duplicates** - Track when and how often duplicates occur
- **Documentation** - Clearly document which endpoints are idempotent
- **Client guidance** - Recommend clients always send idempotency keys
