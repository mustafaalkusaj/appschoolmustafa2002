# Caching Advisor

## Name
caching-advisor

## Description
Provides caching strategies and implementations for backend applications. Proper caching reduces database load, improves response times, and enhances overall system performance.

**When to use:**
- When database queries are slow or resource-intensive
- When the same data is read frequently but updated rarely
- When you need to reduce API response times
- When building high-traffic applications
- When implementing session storage
- When you want to reduce costs on cloud database services

## Instructions

1. **Analyze data access patterns** - Read/write ratio, frequency, staleness tolerance
2. **Choose cache strategy** - Cache-aside, write-through, read-through
3. **Select cache storage** - Redis, Memcached, in-memory
4. **Define cache keys** - Consistent naming convention
5. **Set TTL policies** - Time-based expiration rules
6. **Implement cache invalidation** - Event-based, TTL-based, manual
7. **Add monitoring** - Hit/miss ratios, memory usage

## Expected Input

```javascript
{
  "cacheStrategy": "cache-aside", // or "write-through", "read-through"
  "cacheStore": "Redis",
  "items": [
    {
      "name": "User Profile",
      "keyPattern": "user:{id}",
      "ttl": 3600,
      "invalidation": "event-based"
    },
    {
      "name": "Product Catalog",
      "keyPattern": "products:list:{category}:{page}",
      "ttl": 300,
      "invalidation": "ttl-only"
    }
  ],
  "framework": "Node.js/Express"
}
```

## Expected Output

```javascript
// Cache service with key generation, TTL, and invalidation
{
  "get": "user:123 -> UserData",
  "set": "user:123 with TTL 3600s",
  "invalidate": "user:123 deleted"
}
```

## Example Usage

**Input:**
```
Implement caching for a blog application using Redis.
Cache: user profiles (1 hour TTL), blog posts (5 min TTL), 
categories (1 hour TTL), popular posts (30 min TTL).
Use cache-aside strategy with event-based invalidation.
```

**Output:**
```typescript
// cache/index.ts
import Redis from 'ioredis';
import { redisConfig } from '../config/redis';
import { logger } from '../utils/logger';

export const redis = new Redis(redisConfig);

redis.on('error', (err) => {
  logger.error('Redis connection error', { error: err.message });
});

redis.on('connect', () => {
  logger.info('Redis connected');
});

// cache/CacheService.ts
export class CacheService {
  private defaultTTL = 3600;

  async get<T>(key: string): Promise<T | null> {
    const data = await redis.get(key);
    if (!data) return null;
    
    try {
      return JSON.parse(data) as T;
    } catch {
      return data as any;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    const serialized = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.setex(key, ttl || this.defaultTTL, serialized);
  }

  async delete(key: string): Promise<void> {
    await redis.del(key);
  }

  async deletePattern(pattern: string): Promise<void> {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  }

  async getOrSet<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetchFn();
    await this.set(key, data, ttl);
    return data;
  }

  async invalidateEvent(entity: string, id: string): Promise<void> {
    await this.delete(`${entity}:${id}`);
    logger.info(`Cache invalidated`, { entity, id });
  }
}

// cache/keyGenerator.ts
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  userProfile: (id: string) => `user:${id}:profile`,
  
  post: (id: string) => `post:${id}`,
  postList: (category?: string, page?: number) => 
    `posts:list:${category || 'all'}:${page || 1}`,
  popularPosts: () => 'posts:popular',
  
  category: (id: string) => `category:${id}`,
  allCategories: () => 'categories:all',
  
  userFeed: (userId: string) => `feed:${userId}`,
  
  stats: (type: string) => `stats:${type}`,
};

// services/UserService.ts with caching
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private cacheService: CacheService
  ) {}

  async getUserById(id: string): Promise<User> {
    return this.cacheService.getOrSet(
      CacheKeys.user(id),
      () => this.userRepository.findById(id),
      3600 // 1 hour TTL
    );
  }

  async getUserProfile(id: string): Promise<UserProfile> {
    return this.cacheService.getOrSet(
      CacheKeys.userProfile(id),
      () => this.userRepository.findProfile(id),
      3600
    );
  }

  async updateUser(id: string, data: UpdateUserDTO): Promise<User> {
    const user = await this.userRepository.update(id, data);
    
    // Invalidate cache
    await this.cacheService.invalidateEvent('user', id);
    await this.cacheService.delete(CacheKeys.userProfile(id));
    
    return user;
  }

  async deleteUser(id: string): Promise<void> {
    await this.userRepository.delete(id);
    
    // Invalidate all related cache
    await this.cacheService.delete(CacheKeys.user(id));
    await this.cacheService.delete(CacheKeys.userProfile(id));
    await this.cacheService.delete(CacheKeys.userFeed(id));
  }
}

// services/PostService.ts with caching
export class PostService {
  constructor(
    private postRepository: PostRepository,
    private cacheService: CacheService
  ) {}

  async getPost(id: string): Promise<Post> {
    return this.cacheService.getOrSet(
      CacheKeys.post(id),
      () => this.postRepository.findById(id),
      300 // 5 min TTL
    );
  }

  async getPostsByCategory(category: string, page: number = 1): Promise<PostList> {
    return this.cacheService.getOrSet(
      CacheKeys.postList(category, page),
      () => this.postRepository.findByCategory(category, page, 20),
      300
    );
  }

  async getPopularPosts(limit: number = 10): Promise<Post[]> {
    return this.cacheService.getOrSet(
      CacheKeys.popularPosts(),
      () => this.postRepository.findPopular(limit),
      1800 // 30 min TTL
    );
  }

  async createPost(data: CreatePostDTO): Promise<Post> {
    const post = await this.postRepository.create(data);
    
    // Invalidate list caches
    await this.cacheService.deletePattern('posts:list:*');
    await this.cacheService.delete(CacheKeys.popularPosts());
    
    // If categorized, invalidate category cache
    if (data.categoryId) {
      await this.cacheService.delete(CacheKeys.category(data.categoryId));
    }
    
    return post;
  }

  async updatePost(id: string, data: UpdatePostDTO): Promise<Post> {
    const post = await this.postRepository.update(id, data);
    
    // Invalidate caches
    await this.cacheService.invalidateEvent('post', id);
    await this.cacheService.deletePattern('posts:list:*');
    await this.cacheService.delete(CacheKeys.popularPosts());
    
    return post;
  }

  async deletePost(id: string): Promise<void> {
    const post = await this.postRepository.findById(id);
    await this.postRepository.delete(id);
    
    // Invalidate caches
    await this.cacheService.invalidateEvent('post', id);
    await this.cacheService.deletePattern('posts:list:*');
    await this.cacheService.delete(CacheKeys.popularPosts());
    
    if (post.categoryId) {
      await this.cacheService.delete(CacheKeys.category(post.categoryId));
    }
  }
}

// Event-driven cache invalidation
export const CacheInvalidationEvents = {
  async onUserUpdated(userId: string) {
    await cacheService.invalidateEvent('user', userId);
    await cacheService.delete(CacheKeys.userProfile(userId));
  },

  async onPostCreated(post: Post) {
    await cacheService.deletePattern('posts:list:*');
    await cacheService.delete(CacheKeys.popularPosts());
  },

  async onPostDeleted(postId: string, categoryId?: string) {
    await cacheService.invalidateEvent('post', postId);
    await cacheService.deletePattern('posts:list:*');
    await cacheService.delete(CacheKeys.popularPosts());
    if (categoryId) {
      await cacheService.delete(CacheKeys.category(categoryId));
    }
  },

  async onCategoryUpdated(categoryId: string) {
    await cacheService.invalidateEvent('category', categoryId);
    await cacheService.delete(CacheKeys.allCategories());
  }
};

// Middleware for automatic cache invalidation
export const cacheInvalidationMiddleware = (model: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    res.on('finish', async () => {
      if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
        const id = req.params.id;
        if (id) {
          await cacheService.invalidateEvent(model, id);
        }
      }
    });
    next();
  };
};

// Cache monitoring
export const CacheMonitor = {
  async getStats() {
    const info = await redis.info('stats');
    const keys = await redis.dbsize();
    
    const hitRate = await redis.get('cache:hits');
    const missRate = await redis.get('cache:misses');
    
    return {
      totalKeys: keys,
      hits: parseInt(hitRate || '0'),
      misses: parseInt(missRate || '0'),
      hitRate: parseFloat(((parseInt(hitRate || '0') / (parseInt(hitRate || '0') + parseInt(missRate || '1'))) * 100).toFixed(2))
    };
  }
};
```

## Caching Strategies

| Strategy | Read Path | Write Path | Best For |
|----------|----------|------------|----------|
| Cache-aside | Check cache, fallback to DB | Write to DB only | Read-heavy workloads |
| Write-through | Always from cache | Write to cache AND DB | Data consistency priority |
| Write-behind | Always from cache | Write to cache, async to DB | Write performance |
| Read-through | Auto-populate cache | Write to DB only | Simplify application code |

## TTL Guidelines

| Data Type | Recommended TTL | Rationale |
|-----------|-----------------|-----------|
| User sessions | 24 hours | Session duration |
| User profiles | 1 hour | Rarely changes |
| Product catalog | 5-30 min | Price/availability updates |
| Static content | 1-24 hours | CDN handles this |
| API responses | 1-5 min | Fresh data priority |
| Statistics | 5-15 min | Real-time aggregates expensive |

## Best Practices

- **Key naming** - Use consistent, namespaced patterns
- **TTL selection** - Balance freshness vs performance
- **Cache warming** - Pre-populate on deployment
- **Cold start** - Handle cache miss gracefully
- **Serialization** - JSON for most data, consider msgpack
- **Connection pooling** - Reuse connections
- **Monitoring** - Track hit/miss ratios
- **Eviction policies** - LRU, LFU, TTL-based
