/**
 * Cache strategies for different API endpoints
 * Defines cache behavior for various dashboard and data endpoints
 */

export const CACHE_STRATEGIES = {
  // Dashboard endpoints - 5 minutes
  BUDGETS_LIST: 'budgets-list',

  // Expenses endpoints - 5 minutes
  EXPENSES_LIST: 'expenses-list',

  // Payments endpoints - 5 minutes
  PAYMENTS_META: 'payments-meta',
  PAYMENTS_LIST: 'payments-list',

  // Students endpoints - 5 minutes
  STUDENTS_LIST: 'students-list',
  STUDENTS_META: 'students-meta',

  // Activity endpoints - 5 minutes
  TEACHER_ACTIVITY_META: 'teacher-activity-meta',
} as const;

interface CacheConfig {
  maxAge: number; // seconds
  sMaxAge?: number; // seconds for CDN/shared cache
  staleWhileRevalidate?: number; // seconds to serve stale while revalidating
  public?: boolean; // whether to cache in shared caches
}

const CACHE_CONFIG: Record<string, CacheConfig> = {
  'budgets-list': {
    maxAge: 300, // 5 minutes
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
  'expenses-list': {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
  'payments-meta': {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
  'payments-list': {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
  'students-list': {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
  'students-meta': {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
  'teacher-activity-meta': {
    maxAge: 300,
    sMaxAge: 300,
    staleWhileRevalidate: 60,
    public: false,
  },
};

/**
 * Generate cache headers for a specific cache strategy
 * Returns HTTP cache control headers compatible with NextResponse
 */
export function getCacheHeaders(
  strategyKey: string,
): Record<string, string> {
  const config = CACHE_CONFIG[strategyKey];

  if (!config) {
    // Default fallback for unknown strategies
    return {
      'cache-control': 'private, max-age=300, stale-while-revalidate=60',
    };
  }

  const cacheControlParts: string[] = [];

  if (config.public) {
    cacheControlParts.push('public');
  } else {
    cacheControlParts.push('private');
  }

  cacheControlParts.push(`max-age=${config.maxAge}`);

  if (config.sMaxAge !== undefined) {
    cacheControlParts.push(`s-maxage=${config.sMaxAge}`);
  }

  if (config.staleWhileRevalidate !== undefined) {
    cacheControlParts.push(`stale-while-revalidate=${config.staleWhileRevalidate}`);
  }

  return {
    'cache-control': cacheControlParts.join(', '),
  };
}
