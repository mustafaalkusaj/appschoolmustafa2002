# Job Queue Helper

## Name
job-queue-helper

## Description
Builds and manages job queue systems for handling asynchronous tasks. Job queues are essential for offloading heavy processing, scheduling tasks, and handling high-volume background work without blocking HTTP responses.

**When to use:**
- When you need to process tasks asynchronously (sending emails, generating reports)
- When handling high-volume operations that would timeout if synchronous
- When scheduling tasks for later execution (cron jobs, delayed tasks)
- When implementing retry logic for failed operations
- When building real-time notification systems
- When processing large data imports/exports

## Instructions

1. **Choose a queue library** - Bull (Redis), Sidekiq (Redis), Bee (Redis), Agenda (MongoDB)
2. **Set up queue infrastructure** - Redis/MongoDB connection, queue definitions
3. **Create job processors** - Worker functions that process jobs
4. **Implement retry logic** - Automatic retries with backoff
5. **Add job scheduling** - Delayed jobs, cron-like scheduling
6. **Build monitoring** - Queue status, job progress, failure handling
7. **Implement error handling** - Dead letter queues, alerting

## Expected Input

```javascript
{
  "library": "Bull", // or "Sidekiq", "Agenda"
  "queues": [
    { "name": "emails", "concurrency": 5 },
    { "name": "image-processing", "concurrency": 2 },
    { "name": "reports", "concurrency": 1 }
  ],
  "features": ["retry", "scheduling", "priority", "rate-limiting"],
  "redisUrl": "redis://localhost:6379"
}
```

## Expected Output

```javascript
// Queue setup, workers, and job creation
{
  "queues": {
    "emails": { "concurrency": 5, "retries": 3 },
    "image-processing": { "concurrency": 2, "retries": 2 },
    "reports": { "concurrency": 1, "retries": 1 }
  },
  "workers": ["EmailWorker", "ImageProcessingWorker", "ReportWorker"]
}
```

## Example Usage

**Input:**
```
Set up Bull queues for an e-commerce application:
1. Email queue (welcome emails, order confirmations, password resets)
2. Notification queue (push notifications, SMS)
3. Order processing queue (inventory updates, fulfillment)
Include: queue setup, worker implementation, job scheduling, retry logic, and monitoring.
```

**Output:**
```typescript
// queue/index.ts
import Queue from 'bull';
import { redisConfig } from '../config/redis';

export const emailQueue = new Queue('emails', redisConfig, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const notificationQueue = new Queue('notifications', redisConfig, {
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 },
    removeOnComplete: 100,
    removeOnFail: 500
  }
});

export const orderQueue = new Queue('orders', redisConfig, {
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    priority: 2,
    removeOnComplete: true,
    removeOnFail: false
  }
});

// queue/workers/email.worker.ts
import { emailQueue } from '../index';
import { EmailService } from '../../services/EmailService';
import { logger } from '../../utils/logger';

interface EmailJobData {
  to: string;
  subject: string;
  template: string;
  context: Record<string, any>;
  type: 'welcome' | 'order-confirmation' | 'password-reset';
}

emailQueue.process(5, async (job: Bull.Job<EmailJobData>) => {
  logger.info(`Processing email job ${job.id}`, { type: job.data.type });

  const { to, subject, template, context } = job.data;
  
  try {
    const emailService = new EmailService();
    await emailService.send({
      to,
      subject,
      template,
      context
    });

    logger.info(`Email sent successfully to ${to}`);
    return { success: true, sentAt: new Date() };
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, { error });
    throw error; // Re-throw for retry
  }
});

emailQueue.on('completed', (job, result) => {
  logger.info(`Email job ${job.id} completed`, { result });
});

emailQueue.on('failed', (job, err) => {
  logger.error(`Email job ${job?.id} failed`, { error: err.message });
});

// queue/workers/notification.worker.ts
import { notificationQueue } from '../index';
import { PushService } from '../../services/PushService';
import { SMSService } from '../../services/SMSService';

interface NotificationJobData {
  userId: string;
  channels: ('push' | 'sms' | 'email')[];
  title: string;
  message: string;
  data?: Record<string, any>;
  scheduledFor?: number;
}

notificationQueue.process(10, async (job: Bull.Job<NotificationJobData>) => {
  const { userId, channels, title, message, data } = job.data;
  const results = [];

  for (const channel of channels) {
    switch (channel) {
      case 'push':
        const pushService = new PushService();
        results.push(await pushService.send(userId, title, message, data));
        break;
      case 'sms':
        const smsService = new SMSService();
        results.push(await smsService.send(userId, message));
        break;
    }
  }

  return results;
});

// queue/workers/order.worker.ts
import { orderQueue } from '../index';
import { OrderService } from '../../services/OrderService';
import { InventoryService } from '../../services/InventoryService';

interface OrderJobData {
  orderId: string;
  type: 'process' | 'fulfill' | 'cancel' | 'refund';
  metadata?: Record<string, any>;
}

orderQueue.process(async (job: Bull.Job<OrderJobData>) => {
  const { orderId, type, metadata } = job.data;
  const orderService = new OrderService();
  const inventoryService = new InventoryService();

  switch (type) {
    case 'process':
      await job.progress(10);
      await orderService.validateOrder(orderId);
      await job.progress(30);
      await inventoryService.reserve(orderId);
      await job.progress(60);
      await orderService.initiatePayment(orderId);
      await job.progress(100);
      return { status: 'processed' };

    case 'cancel':
      await inventoryService.release(orderId);
      await orderService.markCancelled(orderId);
      return { status: 'cancelled' };

    case 'refund':
      await orderService.processRefund(orderId);
      return { status: 'refunded' };
  }
});

// queue/jobs/email.job.ts - Job creation helpers
export const EmailJobs = {
  async sendWelcomeEmail(userId: string, email: string, name: string) {
    return emailQueue.add({
      to: email,
      subject: 'Welcome to our platform!',
      template: 'welcome',
      context: { name },
      type: 'welcome'
    }, {
      priority: 5,
      delay: 0
    });
  },

  async sendOrderConfirmation(orderId: string, email: string, orderDetails: any) {
    return emailQueue.add({
      to: email,
      subject: `Order #${orderId} Confirmed`,
      template: 'order-confirmation',
      context: orderDetails,
      type: 'order-confirmation'
    }, {
      priority: 3
    });
  },

  async sendPasswordReset(email: string, resetToken: string) {
    return emailQueue.add({
      to: email,
      subject: 'Password Reset Request',
      template: 'password-reset',
      context: { resetToken },
      type: 'password-reset'
    }, {
      delay: 0
    });
  },

  async scheduleEmail(data: EmailJobData, scheduleDate: Date) {
    const delay = scheduleDate.getTime() - Date.now();
    return emailQueue.add(data, { delay });
  }
};

export const OrderJobs = {
  async processOrder(orderId: string, metadata?: Record<string, any>) {
    return orderQueue.add({ orderId, type: 'process', metadata }, {
      jobId: `order-process-${orderId}` // Idempotency key
    });
  },

  async cancelOrder(orderId: string) {
    return orderQueue.add({ orderId, type: 'cancel' }, {
      priority: 1 // High priority
    });
  },

  async scheduleOrderFulfillment(orderId: string, fulfillAt: Date) {
    return orderQueue.add({ orderId, type: 'fulfill' }, {
      delay: fulfillAt.getTime() - Date.now()
    });
  }
};

// queue/monitoring.ts
export const QueueMonitor = {
  async getQueueStats(queueName: string) {
    const queue = new Queue(queueName, redisConfig);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount()
    ]);
    return { waiting, active, completed, failed, delayed };
  },

  async getFailedJobs(queueName: string, start = 0, end = 10) {
    const queue = new Queue(queueName, redisConfig);
    const failed = await queue.getFailed(start, end);
    return failed.map(job => ({
      id: job.id,
      data: job.data,
      failedReason: job.failedReason,
      failedAt: job.finishedOn
    }));
  },

  async retryFailedJob(queueName: string, jobId: string) {
    const queue = new Queue(queueName, redisConfig);
    const job = await queue.getJob(jobId);
    if (job) await job.retry();
  }
};
```

## Queue Patterns

| Pattern | Use Case | Implementation |
|---------|----------|----------------|
| Priority Queue | Urgent tasks first | `priority: 1-10` |
| Delayed Jobs | Schedule for later | `delay: timestamp` |
| Cron Jobs | Recurring tasks | Bull repeat() or external scheduler |
| Batching | Group similar jobs | Process with `bulkAdd` |
| Rate Limiting | Prevent overload | Bull rate limiter |
| Idempotency | Prevent duplicates | Use unique job IDs |

## Best Practices

- **Idempotent jobs** - Make jobs safe to retry
- **Small payload sizes** - Store data references, not large objects
- **Progress reporting** - Update job progress for better UX
- **Error handling** - Always catch and log errors in workers
- **Resource limits** - Set appropriate concurrency
- **Queue monitoring** - Alert on failed jobs and queue depth
- **Clean up** - Remove completed jobs to manage memory
