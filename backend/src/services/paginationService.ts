import { redis } from '@/lib/redis';

export interface PaginationOptions {
  page: number;
  limit: number;
  cursor?: string; // For cursor-based pagination
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
  };
}

export interface CursorPaginationResult<T> {
  data: T[];
  pagination: {
    limit: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    nextCursor?: string;
    previousCursor?: string;
    total?: number;
  };
}

class PaginationService {
  private readonly CURSOR_CACHE_TTL = 3600; // 1 hour

  /**
   * Create standard pagination result
   */
  createPaginationResult<T>(
    data: T[],
    total: number,
    options: PaginationOptions
  ): PaginationResult<T> {
    const { page, limit } = options;
    const totalPages = Math.ceil(total / limit);
    
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1
      }
    };
  }

  /**
   * Create cursor-based pagination result for infinite scroll
   */
  createCursorPaginationResult<T>(
    data: T[],
    options: PaginationOptions,
    getCursorValue: (item: T) => string,
    total?: number
  ): CursorPaginationResult<T> {
    const { limit } = options;
    const hasNextPage = data.length === limit;
    
    let nextCursor: string | undefined;
    let previousCursor: string | undefined;

    if (data.length > 0) {
      if (hasNextPage) {
        nextCursor = getCursorValue(data[data.length - 1]);
      }
      previousCursor = getCursorValue(data[0]);
    }

    return {
      data,
      pagination: {
        limit,
        hasNextPage,
        hasPreviousPage: !!options.cursor,
        nextCursor,
        previousCursor,
        total
      }
    };
  }

  /**
   * Generate cursor for infinite scroll
   */
  generateCursor(sortBy: string, value: any, id: string): string {
    const cursorData = {
      sortBy,
      value: value.toString(),
      id,
      timestamp: Date.now()
    };
    return Buffer.from(JSON.stringify(cursorData)).toString('base64');
  }

  /**
   * Parse cursor for infinite scroll
   */
  parseCursor(cursor: string): { sortBy: string; value: string; id: string; timestamp: number } | null {
    try {
      const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
      const parsed = JSON.parse(decoded);
      
      // Validate cursor structure
      if (!parsed.sortBy || !parsed.value || !parsed.id || !parsed.timestamp) {
        return null;
      }

      // Check if cursor is not too old (24 hours)
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      if (Date.now() - parsed.timestamp > maxAge) {
        return null;
      }

      return parsed;
    } catch (error) {
      return null;
    }
  }

  /**
   * Cache pagination result for performance
   */
  async cachePaginationResult<T>(
    cacheKey: string,
    result: PaginationResult<T> | CursorPaginationResult<T>,
    ttl: number = 300
  ): Promise<void> {
    try {
      await redis.setEx(cacheKey, ttl, JSON.stringify(result));
    } catch (error) {
      console.error('Failed to cache pagination result:', error);
    }
  }

  /**
   * Get cached pagination result
   */
  async getCachedPaginationResult<T>(
    cacheKey: string
  ): Promise<PaginationResult<T> | CursorPaginationResult<T> | null> {
    try {
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached pagination result:', error);
      return null;
    }
  }

  /**
   * Build Prisma cursor-based query options
   */
  buildCursorQuery(
    cursor: string | undefined,
    limit: number,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc'
  ): any {
    const query: any = {
      take: limit + 1, // Take one extra to check if there's a next page
      orderBy: { [sortBy]: sortOrder }
    };

    if (cursor) {
      const parsedCursor = this.parseCursor(cursor);
      if (parsedCursor && parsedCursor.sortBy === sortBy) {
        // Build cursor condition based on sort order
        const cursorCondition: any = {};
        
        if (sortOrder === 'desc') {
          cursorCondition[sortBy] = { lt: parsedCursor.value };
        } else {
          cursorCondition[sortBy] = { gt: parsedCursor.value };
        }

        query.cursor = { id: parsedCursor.id };
        query.skip = 1; // Skip the cursor item itself
        query.where = cursorCondition;
      }
    }

    return query;
  }

  /**
   * Process cursor-based query results
   */
  processCursorResults<T extends { id: string }>(
    results: T[],
    limit: number,
    sortBy: string,
    getSortValue: (item: T) => any
  ): { data: T[]; hasNextPage: boolean } {
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    return { data, hasNextPage };
  }

  /**
   * Generate cache key for pagination
   */
  generatePaginationCacheKey(
    baseKey: string,
    options: PaginationOptions,
    additionalParams?: Record<string, any>
  ): string {
    const params = {
      ...options,
      ...additionalParams
    };
    
    const paramString = Object.keys(params)
      .sort()
      .map(key => `${key}:${(params as any)[key]}`)
      .join('|');
    
    return `${baseKey}:${Buffer.from(paramString).toString('base64')}`;
  }

  /**
   * Validate pagination parameters
   */
  validatePaginationParams(
    page?: string | number,
    limit?: string | number,
    cursor?: string
  ): { page: number; limit: number; cursor?: string; errors: string[] } {
    const errors: string[] = [];
    let validatedPage = 1;
    let validatedLimit = 20;
    let validatedCursor: string | undefined;

    // Validate page
    if (page !== undefined) {
      const pageNum = typeof page === 'string' ? parseInt(page) : page;
      if (isNaN(pageNum) || pageNum < 1) {
        errors.push('Page must be a positive integer');
      } else {
        validatedPage = pageNum;
      }
    }

    // Validate limit
    if (limit !== undefined) {
      const limitNum = typeof limit === 'string' ? parseInt(limit) : limit;
      if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
        errors.push('Limit must be between 1 and 100');
      } else {
        validatedLimit = limitNum;
      }
    }

    // Validate cursor
    if (cursor) {
      const parsedCursor = this.parseCursor(cursor);
      if (!parsedCursor) {
        errors.push('Invalid cursor format or expired cursor');
      } else {
        validatedCursor = cursor;
      }
    }

    return {
      page: validatedPage,
      limit: validatedLimit,
      cursor: validatedCursor,
      errors
    };
  }
}

export const paginationService = new PaginationService();