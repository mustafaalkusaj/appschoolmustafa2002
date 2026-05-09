// Advanced request deduplication and caching
// Prevents duplicate API calls when multiple components request the same data

const requestCache = new Map<string, {
  promise: Promise<any>;
  createdAt: number;
}>();

const REQUEST_DEDUP_TTL = 5000; // 5 seconds - deduplicate requests within this window

/**
 * Deduplicates fetch requests - if the same request is made within TTL,
 * returns the same promise instead of making multiple requests
 */
export async function deduplicatedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = REQUEST_DEDUP_TTL
): Promise<T> {
  const now = Date.now();
  const cached = requestCache.get(key);
  
  if (cached && now - cached.createdAt < ttlMs) {
    return cached.promise;
  }
  
  const promise = fetcher().catch((error) => {
    // Only evict our own entry — a concurrent request may have set a newer one
    const entry = requestCache.get(key);
    if (entry && entry.createdAt === now) {
      requestCache.delete(key);
    }
    throw error;
  });

  requestCache.set(key, { promise, createdAt: now });
  return promise;
}

/**
 * Batch multiple requests into a single API call
 * Useful for combining multiple queries into one endpoint
 */
export async function batchedFetch<T>(
  requests: { key: string; params: Record<string, any> }[],
  batchFetcher: (params: Record<string, any>[]) => Promise<T[]>,
  ttlMs?: number
): Promise<T[]> {
  const batchKey = requests.map(r => r.key).join('||');
  
  return deduplicatedFetch(
    `batch:${batchKey}`,
    () => batchFetcher(requests.map(r => r.params)),
    ttlMs
  );
}

/**
 * Clear all cached requests (useful after mutations)
 */
export function clearRequestCache(): void {
  requestCache.clear();
}

/**
 * Clear specific request from cache
 */
export function clearCacheFor(key: string): void {
  requestCache.delete(key);
}

/**
 * Get cache stats (useful for debugging)
 */
export function getRequestCacheStats() {
  return {
    size: requestCache.size,
    keys: Array.from(requestCache.keys()),
  };
}
