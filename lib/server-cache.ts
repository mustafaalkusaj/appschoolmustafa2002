type CacheEntry<T> = {
  expiresAt: number;
  tags: string[];
  value: T;
};

const valueStore = new Map<string, CacheEntry<unknown>>();
const pendingStore = new Map<string, Promise<unknown>>();
const tagStore = new Map<string, Set<string>>();
const CLEANUP_INTERVAL_MS = 60_000;
let lastCleanupAt = 0;

function cleanupExpiredEntries(now: number) {
  if (now - lastCleanupAt < CLEANUP_INTERVAL_MS) {
    return;
  }

  lastCleanupAt = now;
  valueStore.forEach((entry, key) => {
    if (entry.expiresAt > now) {
      return;
    }

    valueStore.delete(key);
    for (const tag of entry.tags) {
      const keys = tagStore.get(tag);
      if (!keys) {
        continue;
      }

      keys.delete(key);
      if (keys.size === 0) {
        tagStore.delete(tag);
      }
    }
  });
}

function indexEntryTags(key: string, tags: string[]) {
  for (const tag of tags) {
    const keys = tagStore.get(tag) ?? new Set<string>();
    keys.add(key);
    tagStore.set(tag, keys);
  }
}

export async function rememberWithTtl<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>,
  options?: { tags?: string[] },
) {
  const now = Date.now();
  cleanupExpiredEntries(now);

  const cached = valueStore.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const pending = pendingStore.get(key) as Promise<T> | undefined;
  if (pending) {
    return pending;
  }

  const nextPending = loader()
    .then((value) => {
      const tags = options?.tags ? Array.from(new Set(options.tags.filter(Boolean))) : [];
      valueStore.set(key, {
        value,
        tags,
        expiresAt: Date.now() + ttlMs,
      });
      indexEntryTags(key, tags);
      return value;
    })
    .finally(() => {
      pendingStore.delete(key);
    });

  pendingStore.set(key, nextPending);
  return nextPending;
}

export function invalidateCacheKeys(keys: string[]) {
  for (const key of keys) {
    const cached = valueStore.get(key);
    valueStore.delete(key);
    pendingStore.delete(key);

    if (!cached) {
      continue;
    }

    for (const tag of cached.tags) {
      const tagKeys = tagStore.get(tag);
      if (!tagKeys) {
        continue;
      }

      tagKeys.delete(key);
      if (tagKeys.size === 0) {
        tagStore.delete(tag);
      }
    }
  }
}

export function invalidateCacheTags(tags: string[]) {
  const uniqueKeys = new Set<string>();
  for (const tag of tags) {
    const keys = tagStore.get(tag);
    if (!keys) {
      continue;
    }

    keys.forEach((key) => uniqueKeys.add(key));
    tagStore.delete(tag);
  }

  invalidateCacheKeys(Array.from(uniqueKeys));
}

export function buildSchoolCacheTag(schoolId: string, domain: string) {
  return `school:${schoolId}:${domain}`;
}

export function invalidateSchoolCacheDomains(schoolId: string, domains: string[]) {
  invalidateCacheTags(domains.map((domain) => buildSchoolCacheTag(schoolId, domain)));
}
