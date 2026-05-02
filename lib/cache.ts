import { createClient } from 'redis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = createClient({ url: redisUrl });

let isConnected = false;

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

redis.on('connect', () => {
  isConnected = true;
  console.log('✅ Redis connected');
});

export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!isConnected) return null;
    try {
      const data = await redis.get(key);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      console.error('Cache get error:', e);
      return null;
    }
  },

  async set<T>(key: string, value: T, ttl = 300): Promise<boolean> {
    if (!isConnected) return false;
    try {
      await redis.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Cache set error:', e);
      return false;
    }
  },

  async invalidate(pattern: string): Promise<void> {
    if (!isConnected) return;
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (e) {
      console.error('Cache invalidate error:', e);
    }
  }
};

// Connect on startup
if (!isConnected) {
  redis.connect().catch(console.error);
}

export default redis;
