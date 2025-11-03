import { Request, Response, NextFunction } from 'express';
import { redis } from '@/lib/redis';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  keyGenerator?: (req: Request) => string;
  condition?: (req: Request, res: Response) => boolean;
  varyBy?: string[]; // Headers to vary cache by
}

/**
 * Redis-based response caching middleware
 */
export function cacheMiddleware(options: CacheOptions = {}) {
  const {
    ttl = 300, // 5 minutes default
    keyGenerator = (req) => `cache:${req.method}:${req.originalUrl}`,
    condition = (req, res) => req.method === 'GET' && res.statusCode === 200,
    varyBy = []
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip caching for non-GET requests or if condition not met
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key
      let cacheKey = keyGenerator(req);
      
      // Add vary headers to cache key
      if (varyBy.length > 0) {
        const varyValues = varyBy.map(header => req.get(header) || '').join(':');
        cacheKey += `:${varyValues}`;
      }

      // Try to get cached response
      const cached = await redis.get(cacheKey);
      if (cached) {
        const { data, headers, statusCode } = JSON.parse(cached);
        
        // Set cached headers
        Object.entries(headers).forEach(([key, value]) => {
          res.set(key, value as string);
        });
        
        // Add cache hit header
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Key', cacheKey);
        
        return res.status(statusCode).json(data);
      }

      // Store original json method
      const originalJson = res.json;
      
      // Override json method to cache response
      res.json = function(data: any) {
        // Check if we should cache this response
        if (condition(req, res)) {
          const cacheData = {
            data,
            headers: res.getHeaders(),
            statusCode: res.statusCode
          };
          
          // Cache the response asynchronously
          redis.setEx(cacheKey, ttl, JSON.stringify(cacheData)).catch(error => {
            console.error('Failed to cache response:', error);
          });
        }
        
        // Add cache miss header
        res.set('X-Cache', 'MISS');
        res.set('X-Cache-Key', cacheKey);
        
        // Call original json method
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

/**
 * Cache invalidation helper
 */
export class CacheManager {
  /**
   * Invalidate cache by pattern
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('Failed to invalidate cache pattern:', error);
    }
  }

  /**
   * Invalidate specific cache key
   */
  static async invalidateKey(key: string): Promise<void> {
    try {
      await redis.del(key);
    } catch (error) {
      console.error('Failed to invalidate cache key:', error);
    }
  }

  /**
   * Warm up cache with fresh data
   */
  static async warmUp(key: string, data: any, ttl: number = 300): Promise<void> {
    try {
      await redis.setEx(key, ttl, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to warm up cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  static async getStats(): Promise<{
    totalKeys: number;
    cacheKeys: number;
    memoryUsage?: string;
  }> {
    try {
      const allKeys = await redis.keys('*');
      const cacheKeys = await redis.keys('cache:*');
      
      return {
        totalKeys: allKeys.length,
        cacheKeys: cacheKeys.length
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalKeys: 0,
        cacheKeys: 0
      };
    }
  }
}

/**
 * Specific cache configurations for different endpoints
 */
export const cacheConfigs = {
  // Short-term cache for frequently changing data
  shortTerm: {
    ttl: 60, // 1 minute
    keyGenerator: (req: Request) => `cache:short:${req.method}:${req.originalUrl}`
  },
  
  // Medium-term cache for semi-static data
  mediumTerm: {
    ttl: 300, // 5 minutes
    keyGenerator: (req: Request) => `cache:medium:${req.method}:${req.originalUrl}`
  },
  
  // Long-term cache for static data
  longTerm: {
    ttl: 3600, // 1 hour
    keyGenerator: (req: Request) => `cache:long:${req.method}:${req.originalUrl}`
  },
  
  // User-specific cache
  userSpecific: {
    ttl: 300,
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || 'anonymous';
      return `cache:user:${userId}:${req.method}:${req.originalUrl}`;
    },
    varyBy: ['authorization']
  },
  
  // Search results cache
  searchResults: {
    ttl: 600, // 10 minutes
    keyGenerator: (req: Request) => {
      const query = new URLSearchParams(req.query as any).toString();
      return `cache:search:${query}`;
    }
  }
};