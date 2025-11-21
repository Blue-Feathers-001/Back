/**
 * Simple in-memory cache utility for performance optimization
 * For production, consider using Redis for distributed caching
 */

interface CacheEntry<T> {
  data: T;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    // Cleanup expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Get a value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set a value in cache with TTL in seconds
   */
  set<T>(key: string, data: T, ttlSeconds: number = 60): void {
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Delete a specific key
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all keys matching a pattern
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get or set with callback (fetch if not cached)
   */
  async getOrSet<T>(key: string, fetcher: () => Promise<T>, ttlSeconds: number = 60): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return cached;

    const data = await fetcher();
    this.set(key, data, ttlSeconds);
    return data;
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Singleton instance
export const cache = new MemoryCache();

// Cache key builders for consistency
export const CacheKeys = {
  user: (id: string) => `user:${id}`,
  dashboardStats: () => 'dashboard:stats',
  activeMembers: () => 'members:active',
  packages: () => 'packages:all',
  paymentStats: (period: string) => `payments:stats:${period}`,
  membershipStats: () => 'membership:stats',
};

// Default TTLs in seconds
export const CacheTTL = {
  USER: 5 * 60,           // 5 minutes
  DASHBOARD: 30,          // 30 seconds (frequently updated)
  ACTIVE_MEMBERS: 60,     // 1 minute
  PACKAGES: 5 * 60,       // 5 minutes (rarely changes)
  PAYMENT_STATS: 60,      // 1 minute
  MEMBERSHIP_STATS: 60,   // 1 minute
};
