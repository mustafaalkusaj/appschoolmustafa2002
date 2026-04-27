import "server-only";

import { Redis } from "@upstash/redis";

const THROTTLE_PREFIX = "ops:throttle:";

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) return null;
  try {
    return new Redis({ url, token });
  } catch {
    return null;
  }
}

/**
 * Returns true if the key is currently throttled.
 * Fails open (returns false) when Redis is unavailable.
 */
export async function isThrottled(key: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis) return false;
  try {
    const val = await redis.get(`${THROTTLE_PREFIX}${key}`);
    return val !== null;
  } catch {
    return false;
  }
}

/**
 * Marks the key as throttled for the given window.
 * Silently no-ops when Redis is unavailable.
 */
export async function markThrottled(key: string, windowSeconds: number): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(`${THROTTLE_PREFIX}${key}`, "1", { ex: windowSeconds });
  } catch {
    // fail-open: don't break notification on throttle store error
  }
}
