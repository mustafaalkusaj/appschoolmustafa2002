# Webhook Handler Builder

## Name
webhook-handler-builder

## Description
Builds webhook handlers to receive and process events from external services (payment gateways, SaaS platforms, other microservices). Webhooks allow external systems to notify your application about events in real-time.

**When to use:**
- When integrating with third-party services (Stripe, GitHub, Slack)
- When receiving real-time event notifications
- When building event-driven architectures between services
- When you need to synchronize data with external systems
- When implementing real-time notifications or updates
- When building integration points for other services

## Instructions

1. **Verify webhook signature** - Ensure requests are from legitimate sources
2. **Parse event payload** - Extract event type and data
3. **Validate event data** - Ensure payload meets expected schema
4. **Process events asynchronously** - Queue for background processing
5. **Handle idempotency** - Prevent duplicate processing
6. **Return acknowledgment** - Respond quickly to avoid timeouts
7. **Implement retry handling** - Store failed events for retry

## Expected Input

```javascript
{
  "provider": "stripe", // or "github", "custom", etc.
  "events": ["payment.succeeded", "payment.failed", "subscription.updated"],
  "security": ["signature-verification", "timestamp-validation"],
  "processing": "async", // or "sync"
  "idempotencyKey": "event-id"
}
```

## Expected Output

```javascript
// Webhook handler with verification and processing
{
  "verification": "HMAC-SHA256 signature validated",
  "events": {
    "payment.succeeded": "OrderService.processPaymentSuccess()",
    "payment.failed": "OrderService.handlePaymentFailure()"
  },
  "response": { "status": "received", "processed": false }
}
```

## Example Usage

**Input:**
```
Build a webhook handler for Stripe payment events.
Events: payment_intent.succeeded, payment_intent.failed, charge.refunded.
Include: signature verification, event parsing, async processing via queue,
idempotency, and error handling.
Framework: Express with TypeScript.
```

**Output:**
```typescript
// webhooks/stripe/index.ts
import express, { Request, Response, Router } from 'express';
import Stripe from 'stripe';
import crypto from 'crypto';
import { WebhookJobQueue } from '../queues/webhook.job';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookQueue = new WebhookJobQueue();

export const stripeWebhookRouter = Router();

// Stripe webhook endpoint
stripeWebhookRouter.post(
  '/stripe',
  express.raw({ type: 'application/json' }),
  stripeWebhookController.handle
);

export const stripeWebhookController = {
  async handle(req: Request, res: Response) {
    const signature = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
    } catch (err: any) {
      logger.error('Webhook signature verification failed', {
        error: err.message,
        ip: req.ip
      });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    // Acknowledge receipt immediately
    res.status(200).json({ received: true });

    // Process asynchronously
    try {
      await webhookQueue.add({
        provider: 'stripe',
        eventId: event.id,
        eventType: event.type,
        payload: event.data.object,
        receivedAt: new Date().toISOString(),
        retryCount: 0
      });
    } catch (error) {
      logger.error('Failed to queue Stripe webhook', { eventId: event.id, error });
    }
  }
};

// Generic webhook handler for custom events
export const genericWebhookRouter = Router();

export class WebhookSignatureVerifier {
  static async verify(
    payload: string,
    signature: string,
    secret: string,
    tolerance: number = 300
  ): Promise<boolean> {
    const [, timestamp, v1Signature] = signature.split('.');
    
    if (!timestamp || !v1Signature) return false;

    // Check timestamp to prevent replay attacks
    const timestampNum = parseInt(timestamp);
    if (Math.abs(Date.now() / 1000 - timestampNum) > tolerance) {
      logger.warn('Webhook timestamp outside tolerance');
      return false;
    }

    // Compute expected signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(v1Signature),
      Buffer.from(expectedSignature)
    );
  }
}

genericWebhookRouter.post(
  '/:provider',
  express.json(),
  async (req: Request, res: Response) => {
    const { provider } = req.params;
    const signature = req.headers['x-webhook-signature'] as string;
    const webhookSecret = getWebhookSecret(provider);

    if (!signature || !webhookSecret) {
      return res.status(401).json({ error: 'Missing signature' });
    }

    const isValid = await WebhookSignatureVerifier.verify(
      JSON.stringify(req.body),
      signature,
      webhookSecret
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    res.status(200).json({ received: true });

    const event = parseEvent(req.body, provider);
    await webhookQueue.add({
      provider,
      eventId: event.id,
      eventType: event.type,
      payload: event.data,
      receivedAt: new Date().toISOString(),
      retryCount: 0
    });
  }
);

// Event handlers registry
export const WebhookEventHandlers = {
  'payment_intent.succeeded': async (payload: any) => {
    const orderId = payload.metadata?.orderId;
    if (orderId) {
      await orderService.updatePaymentStatus(orderId, 'succeeded', {
        stripePaymentId: payload.id,
        amount: payload.amount,
        currency: payload.currency
      });
    }
  },

  'payment_intent.payment_failed': async (payload: any) => {
    const orderId = payload.metadata?.orderId;
    if (orderId) {
      await orderService.updatePaymentStatus(orderId, 'failed', {
        stripePaymentId: payload.id,
        failureCode: payload.last_payment_error?.code,
        failureMessage: payload.last_payment_error?.message
      });
      await notificationService.sendPaymentFailureAlert(orderId);
    }
  },

  'charge.refunded': async (payload: any) => {
    const orderId = payload.payment_intent;
    if (orderId) {
      await orderService.processRefund(payload.amount_refunded, {
        stripeChargeId: payload.id,
        refundId: payload.refunds?.data?.[0]?.id
      });
    }
  },

  'customer.subscription.created': async (payload: any) => {
    await subscriptionService.create({
      stripeSubscriptionId: payload.id,
      customerId: payload.customer,
      status: payload.status,
      currentPeriodEnd: new Date(payload.current_period_end * 1000),
      planId: payload.items.data[0].price.id
    });
  },

  'customer.subscription.updated': async (payload: any) => {
    await subscriptionService.update(payload.id, {
      status: payload.status,
      currentPeriodEnd: new Date(payload.current_period_end * 1000)
    });
  },

  'customer.subscription.deleted': async (payload: any) => {
    await subscriptionService.cancel(payload.id);
  }
};

// Webhook job queue
export class WebhookJobQueue {
  private queue: any;

  async add(job: WebhookJob) {
    await redisClient.zadd(
      'webhook:pending',
      Date.now(),
      JSON.stringify(job)
    );
  }

  async process() {
    const jobs = await redisClient.zrangebyscore(
      'webhook:pending',
      0,
      Date.now()
    );

    for (const jobData of jobs) {
      const job: WebhookJob = JSON.parse(jobData);
      
      try {
        await this.processJob(job);
        await redisClient.zrem('webhook:pending', jobData);
      } catch (error) {
        await this.handleFailure(job, error);
      }
    }
  }

  private async processJob(job: WebhookJob) {
    const handler = WebhookEventHandlers[job.eventType];
    if (!handler) {
      logger.info('No handler for webhook event', { eventType: job.eventType });
      return;
    }

    await handler(job.payload);
    logger.info('Webhook processed', { eventId: job.eventId, eventType: job.eventType });
  }

  private async handleFailure(job: WebhookJob, error: any) {
    const maxRetries = 5;
    
    if (job.retryCount < maxRetries) {
      // Re-queue with incremented retry count
      job.retryCount++;
      const delay = Math.pow(2, job.retryCount) * 1000; // Exponential backoff
      
      setTimeout(() => {
        this.add(job);
      }, delay);
      
      logger.warn('Webhook failed, re-queued', {
        eventId: job.eventId,
        retryCount: job.retryCount,
        error: error.message
      });
    } else {
      // Move to dead letter queue
      await redisClient.zadd(
        'webhook:failed',
        Date.now(),
        JSON.stringify({ ...job, lastError: error.message })
      );
      
      logger.error('Webhook permanently failed', {
        eventId: job.eventId,
        eventType: job.eventType
      });
    }
  }
}

// Idempotency handling
export class WebhookIdempotency {
  private redis: any;

  async isProcessed(eventId: string, provider: string): Promise<boolean> {
    const key = `webhook:processed:${provider}:${eventId}`;
    const result = await this.redis.get(key);
    return result !== null;
  }

  async markProcessed(eventId: string, provider: string, ttl: number = 86400) {
    const key = `webhook:processed:${provider}:${eventId}`;
    await this.redis.setex(key, ttl, '1');
  }

  async checkAndMark(eventId: string, provider: string): Promise<boolean> {
    const key = `webhook:processed:${provider}:${eventId}`;
    const wasSet = await this.redis.set(key, '1', 'NX', 'EX', 86400);
    return wasSet === null; // Returns true if already exists
  }
}

// Middleware to add to webhook routes
export const webhookProcessingMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const idempotency = new WebhookIdempotency();
  
  req.webhookId = req.headers['x-webhook-id'] as string || generateWebhookId();
  
  if (req.webhookId) {
    const alreadyProcessed = await idempotency.checkAndMark(
      req.webhookId,
      req.params.provider
    );
    
    if (alreadyProcessed) {
      logger.info('Duplicate webhook received', { webhookId: req.webhookId });
      return res.status(200).json({ received: true, duplicate: true });
    }
  }
  
  next();
};

// Health check for webhook endpoint
stripeWebhookRouter.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', provider: 'stripe' });
});
```

## Webhook Security Checklist

- [x] Verify webhook signatures (HMAC-SHA256)
- [x] Validate timestamp (prevent replay attacks)
- [x] Use HTTPS only
- [x] Implement idempotency keys
- [x] Process asynchronously
- [x] Log all webhook events
- [x] Implement retry with exponential backoff
- [x] Use dead letter queue for failed events
- [x] Rotate webhook secrets regularly

## Best Practices

- **Respond quickly** - Always acknowledge within seconds
- **Process asynchronously** - Never block the webhook response
- **Verify signatures** - Always validate the source
- **Handle duplicates** - Implement idempotency
- **Retry failed events** - With exponential backoff
- **Monitor processing** - Track success/failure rates
- **Use dead letter queue** - For events that permanently fail
- **Log everything** - For debugging and auditing
