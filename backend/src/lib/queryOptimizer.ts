import { prisma } from './database';
import { redis } from './redis';

/**
 * Query optimization utilities for database performance
 */
export class QueryOptimizer {
  private static readonly QUERY_CACHE_TTL = 300; // 5 minutes
  private static readonly SLOW_QUERY_THRESHOLD = 1000; // 1 second

  /**
   * Execute a query with caching and performance monitoring
   */
  static async executeWithCache<T>(
    cacheKey: string,
    queryFn: () => Promise<T>,
    ttl: number = this.QUERY_CACHE_TTL
  ): Promise<T> {
    const startTime = Date.now();

    try {
      // Try to get from cache first
      const cached = await redis.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      // Execute query
      const result = await queryFn();
      const executionTime = Date.now() - startTime;

      // Log slow queries
      if (executionTime > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`Slow query detected: ${cacheKey} took ${executionTime}ms`);
      }

      // Cache the result
      await redis.setEx(cacheKey, ttl, JSON.stringify(result));

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Query failed: ${cacheKey} after ${executionTime}ms`, error);
      throw error;
    }
  }

  /**
   * Batch queries to reduce database round trips
   */
  static async batchQueries<T>(queries: (() => Promise<T>)[]): Promise<T[]> {
    return Promise.all(queries.map(query => query()));
  }

  /**
   * Optimize listing queries with proper includes and selects
   */
  static getOptimizedListingQuery(includeDetails: boolean = false) {
    const baseSelect = {
      id: true,
      title: true,
      price: true,
      condition: true,
      city: true,
      state: true,
      images: true,
      createdAt: true,
      views: true,
      saves: true,
      negotiable: true
    };

    const detailedSelect = {
      ...baseSelect,
      description: true,
      specifications: true,
      documents: true,
      brand: true,
      model: true,
      year: true,
      latitude: true,
      longitude: true,
      pickupOnly: true,
      canArrangeShipping: true
    };

    return {
      include: {
        seller: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            city: true,
            state: true,
            trustScore: true,
            kycStatus: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
            ...(includeDetails && {
              parent: {
                select: {
                  id: true,
                  name: true,
                  slug: true
                }
              }
            })
          }
        },
        _count: {
          select: {
            messages: true,
            savedBy: true
          }
        }
      }
    };
  }

  /**
   * Optimize user queries
   */
  static getOptimizedUserQuery(includePrivate: boolean = false) {
    const publicSelect = {
      id: true,
      firstName: true,
      lastName: true,
      company: true,
      city: true,
      state: true,
      trustScore: true,
      kycStatus: true,
      createdAt: true
    };

    const privateSelect = {
      ...publicSelect,
      email: true,
      phone: true,
      phoneVerified: true,
      emailVerified: true,
      lastLoginAt: true
    };

    return {
      select: includePrivate ? privateSelect : publicSelect
    };
  }

  /**
   * Optimize message queries for conversations
   */
  static getOptimizedMessageQuery() {
    return {
      select: {
        id: true,
        conversationId: true,
        content: true,
        attachments: true,
        messageType: true,
        quoteAmount: true,
        quoteTerms: true,
        quoteStatus: true,
        readAt: true,
        createdAt: true
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        }
      }
    };
  }

  /**
   * Create optimized pagination query
   */
  static createPaginationQuery(
    page: number,
    limit: number,
    maxLimit: number = 100
  ) {
    const safeLimit = Math.min(limit, maxLimit);
    const skip = (page - 1) * safeLimit;

    return {
      skip,
      take: safeLimit
    };
  }

  /**
   * Create cursor-based pagination for better performance on large datasets
   */
  static createCursorPagination(
    cursor?: string,
    limit: number = 20,
    sortField: string = 'createdAt'
  ) {
    const query: any = {
      take: limit + 1, // Take one extra to check if there's a next page
      orderBy: { [sortField]: 'desc' }
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1; // Skip the cursor item
    }

    return query;
  }

  /**
   * Optimize search queries with proper indexing hints
   */
  static createSearchQuery(searchTerm: string, fields: string[] = ['title', 'description']) {
    const searchTerms = searchTerm.trim().split(/\s+/).filter(term => term.length > 0);
    
    if (searchTerms.length === 0) {
      return {};
    }

    // Use PostgreSQL full-text search for better performance
    const searchConditions = fields.map(field => ({
      [field]: {
        search: searchTerms.join(' & '),
        mode: 'insensitive' as const
      }
    }));

    return {
      OR: searchConditions
    };
  }

  /**
   * Create optimized aggregation queries
   */
  static async getAggregatedStats(cacheKey: string, ttl: number = 3600) {
    return this.executeWithCache(
      cacheKey,
      async () => {
        const [
          totalListings,
          activeListings,
          totalUsers,
          activeUsers,
          totalMessages,
          totalOrders
        ] = await Promise.all([
          prisma.listing.count(),
          prisma.listing.count({
            where: { isActive: true, status: 'LIVE' }
          }),
          prisma.user.count(),
          prisma.user.count({
            where: { isActive: true }
          }),
          prisma.message.count(),
          prisma.order.count()
        ]);

        return {
          listings: { total: totalListings, active: activeListings },
          users: { total: totalUsers, active: activeUsers },
          messages: { total: totalMessages },
          orders: { total: totalOrders }
        };
      },
      ttl
    );
  }

  /**
   * Warm up frequently accessed data
   */
  static async warmUpCache() {
    try {
      console.log('Warming up cache...');

      // Warm up popular categories
      await this.executeWithCache(
        'cache:popular_categories',
        async () => {
          return prisma.category.findMany({
            where: { isActive: true },
            include: {
              _count: {
                select: {
                  listings: {
                    where: { status: 'LIVE', isActive: true }
                  }
                }
              }
            },
            orderBy: { sortOrder: 'asc' }
          });
        },
        3600 // 1 hour
      );

      // Warm up featured listings
      await this.executeWithCache(
        'cache:featured_listings',
        async () => {
          return prisma.listing.findMany({
            where: {
              status: 'LIVE',
              isActive: true,
              views: { gt: 50 }
            },
            ...this.getOptimizedListingQuery(false),
            orderBy: [
              { views: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 20
          });
        },
        600 // 10 minutes
      );

      // Warm up system stats
      await this.getAggregatedStats('cache:system_stats', 3600);

      console.log('Cache warm-up completed');
    } catch (error) {
      console.error('Cache warm-up failed:', error);
    }
  }

  /**
   * Monitor and log query performance
   */
  static async monitorQuery<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await queryFn();
      const executionTime = Date.now() - startTime;
      
      // Log performance metrics
      if (executionTime > this.SLOW_QUERY_THRESHOLD) {
        console.warn(`Slow query: ${queryName} took ${executionTime}ms`);
        
        // Store slow query metrics in Redis for analysis
        await redis.zAdd('slow_queries', {
          score: executionTime,
          value: `${queryName}:${Date.now()}`
        });
        
        // Keep only last 100 slow queries
        await redis.zRemRangeByRank('slow_queries', 0, -101);
      }
      
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`Query failed: ${queryName} after ${executionTime}ms`, error);
      throw error;
    }
  }

  /**
   * Get slow query statistics
   */
  static async getSlowQueryStats(): Promise<Array<{ query: string; time: number; timestamp: number }>> {
    try {
      const slowQueries = await redis.zRangeWithScores('slow_queries', 0, -1, { REV: true });
      
      return slowQueries.map((item: any) => {
        const [queryName, timestamp] = item.value.split(':');
        return {
          query: queryName,
          time: item.score,
          timestamp: parseInt(timestamp)
        };
      });
    } catch (error) {
      console.error('Failed to get slow query stats:', error);
      return [];
    }
  }
}