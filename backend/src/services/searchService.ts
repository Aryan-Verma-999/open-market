import { prisma } from '@/lib/database';
import { redis } from '@/lib/redis';
import { analyticsService } from './analyticsService';
import { paginationService } from './paginationService';
import { Listing, Condition, ListingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

export interface SearchFilters {
  // Text search
  query?: string;
  
  // Category filters
  categoryId?: string;
  categoryIds?: string[]; // For hierarchical category support
  
  // Location filters
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  radius?: number; // in kilometers
  
  // Price filters
  minPrice?: number;
  maxPrice?: number;
  
  // Condition filters
  condition?: Condition;
  conditions?: Condition[];
  
  // Date filters
  createdAfter?: Date;
  createdBefore?: Date;
  
  // Other filters
  sellerId?: string;
  status?: ListingStatus;
  negotiable?: boolean;
  pickupOnly?: boolean;
  canArrangeShipping?: boolean;
}

export interface SearchOptions {
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'price' | 'createdAt' | 'views' | 'saves';
  sortOrder?: 'asc' | 'desc';
  includeInactive?: boolean;
}

export interface SearchResult {
  listings: any[];
  total: number;
  page: number;
  totalPages: number;
  facets?: {
    categories: { id: string; name: string; count: number }[];
    conditions: { condition: Condition; count: number }[];
    priceRanges: { min: number; max: number; count: number }[];
    locations: { city: string; state: string; count: number }[];
  };
}

class SearchService {
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly POPULAR_SEARCHES_KEY = 'popular_searches';
  private readonly SEARCH_ANALYTICS_KEY = 'search_analytics';

  /**
   * Perform full-text search with advanced filtering
   */
  async searchListings(
    filters: SearchFilters,
    options: SearchOptions = {},
    userId?: string
  ): Promise<SearchResult> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'relevance',
      sortOrder = 'desc',
      includeInactive = false
    } = options;

    const skip = (page - 1) * limit;
    
    // Generate cache key
    const cacheKey = this.generateCacheKey(filters, options);
    
    // Try to get from cache first
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        // Track analytics even for cached results
        await this.trackSearchAnalytics(filters.query, filters.categoryId, userId);
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Redis cache error:', error);
    }

    // Build the where clause
    const where = await this.buildWhereClause(filters, includeInactive);
    
    // Get total count
    const total = await prisma.listing.count({ where });

    // Build order by clause
    const orderBy = this.buildOrderByClause(sortBy, sortOrder, filters.query);

    // Execute search query
    const listings = await prisma.listing.findMany({
      where,
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
            parent: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            savedBy: true
          }
        }
      },
      orderBy,
      skip,
      take: limit
    });

    // Calculate relevance scores if text search is used
    const processedListings = filters.query 
      ? this.calculateRelevanceScores(listings, filters.query)
      : listings;

    const result: SearchResult = {
      listings: processedListings,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };

    // Get facets for filtering UI
    if (page === 1) { // Only calculate facets for first page
      result.facets = await this.getFacets(filters);
    }

    // Cache the result
    try {
      await redis.setEx(cacheKey, this.CACHE_TTL, JSON.stringify(result));
    } catch (error) {
      console.error('Redis cache set error:', error);
    }

    // Track search analytics
    await this.trackSearchAnalytics(filters.query, filters.categoryId, userId);

    return result;
  }

  /**
   * Perform cursor-based search for infinite scroll
   */
  async searchListingsWithCursor(
    filters: SearchFilters,
    cursor?: string,
    limit: number = 20,
    sortBy: string = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    userId?: string
  ): Promise<any> {
    // Build the where clause
    const where = await this.buildWhereClause(filters, false);
    
    // Build cursor query
    const cursorQuery = paginationService.buildCursorQuery(cursor, limit, sortBy, sortOrder);
    
    // Merge where conditions
    if (cursorQuery.where) {
      where.AND = where.AND || [];
      where.AND.push(cursorQuery.where);
    }

    // Execute search query
    const listings = await prisma.listing.findMany({
      where,
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
            parent: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        },
        _count: {
          select: {
            messages: true,
            savedBy: true
          }
        }
      },
      orderBy: cursorQuery.orderBy,
      take: cursorQuery.take,
      cursor: cursorQuery.cursor,
      skip: cursorQuery.skip
    });

    // Process cursor results
    const { data, hasNextPage } = paginationService.processCursorResults(
      listings,
      limit,
      sortBy,
      (item: any) => item[sortBy]
    );

    // Calculate relevance scores if text search is used
    const processedListings = filters.query 
      ? this.calculateRelevanceScores(data, filters.query)
      : data;

    // Generate cursors
    const result = paginationService.createCursorPaginationResult(
      processedListings,
      { page: 1, limit, cursor, sortBy, sortOrder },
      (item: any) => paginationService.generateCursor(sortBy, item[sortBy], item.id)
    );

    // Track search analytics
    await this.trackSearchAnalytics(filters.query, filters.categoryId, userId);

    return result;
  }

  /**
   * Build PostgreSQL where clause with full-text search
   */
  private async buildWhereClause(filters: SearchFilters, includeInactive: boolean): Promise<any> {
    const where: any = {};

    // Active status filter
    if (!includeInactive) {
      where.isActive = true;
      where.status = filters.status || ListingStatus.LIVE;
    } else if (filters.status) {
      where.status = filters.status;
    }

    // Full-text search using PostgreSQL capabilities
    if (filters.query) {
      const searchTerms = filters.query.trim().split(/\s+/).filter(term => term.length > 0);
      
      if (searchTerms.length > 0) {
        // Use PostgreSQL full-text search with ranking
        where.OR = [
          // Title search (highest priority)
          {
            title: {
              search: searchTerms.join(' & '),
              mode: 'insensitive'
            }
          },
          // Description search
          {
            description: {
              search: searchTerms.join(' & '),
              mode: 'insensitive'
            }
          },
          // Brand/Model search
          {
            OR: [
              { brand: { in: searchTerms, mode: 'insensitive' } },
              { model: { in: searchTerms, mode: 'insensitive' } }
            ]
          },
          // Category name search
          {
            category: {
              name: {
                search: searchTerms.join(' & '),
                mode: 'insensitive'
              }
            }
          }
        ];
      }
    }

    // Category filters with hierarchical support
    if (filters.categoryId) {
      // Get all child categories
      const childCategories = await this.getChildCategories(filters.categoryId);
      const categoryIds = [filters.categoryId, ...childCategories.map(c => c.id)];
      where.categoryId = { in: categoryIds };
    } else if (filters.categoryIds && filters.categoryIds.length > 0) {
      where.categoryId = { in: filters.categoryIds };
    }

    // Location filters
    if (filters.city) {
      where.city = { contains: filters.city, mode: 'insensitive' };
    }
    if (filters.state) {
      where.state = filters.state;
    }

    // Radius-based location search
    if (filters.latitude && filters.longitude && filters.radius) {
      // Use Haversine formula for radius search
      // This is a simplified version - in production, consider using PostGIS
      const radiusInDegrees = filters.radius / 111; // Rough conversion km to degrees
      where.AND = [
        {
          latitude: {
            gte: filters.latitude - radiusInDegrees,
            lte: filters.latitude + radiusInDegrees
          }
        },
        {
          longitude: {
            gte: filters.longitude - radiusInDegrees,
            lte: filters.longitude + radiusInDegrees
          }
        }
      ];
    }

    // Price filters
    if (filters.minPrice || filters.maxPrice) {
      where.price = {};
      if (filters.minPrice) {
        where.price.gte = new Decimal(filters.minPrice);
      }
      if (filters.maxPrice) {
        where.price.lte = new Decimal(filters.maxPrice);
      }
    }

    // Condition filters
    if (filters.condition) {
      where.condition = filters.condition;
    } else if (filters.conditions && filters.conditions.length > 0) {
      where.condition = { in: filters.conditions };
    }

    // Date filters
    if (filters.createdAfter || filters.createdBefore) {
      where.createdAt = {};
      if (filters.createdAfter) {
        where.createdAt.gte = filters.createdAfter;
      }
      if (filters.createdBefore) {
        where.createdAt.lte = filters.createdBefore;
      }
    }

    // Other filters
    if (filters.sellerId) {
      where.sellerId = filters.sellerId;
    }
    if (filters.negotiable !== undefined) {
      where.negotiable = filters.negotiable;
    }
    if (filters.pickupOnly !== undefined) {
      where.pickupOnly = filters.pickupOnly;
    }
    if (filters.canArrangeShipping !== undefined) {
      where.canArrangeShipping = filters.canArrangeShipping;
    }

    return where;
  }

  /**
   * Get child categories for hierarchical filtering
   */
  private async getChildCategories(categoryId: string): Promise<{ id: string }[]> {
    const children = await prisma.category.findMany({
      where: { parentId: categoryId },
      select: { id: true }
    });

    // Recursively get grandchildren
    const grandChildren = await Promise.all(
      children.map(child => this.getChildCategories(child.id))
    );

    return [...children, ...grandChildren.flat()];
  }

  /**
   * Build order by clause based on sort options
   */
  private buildOrderByClause(
    sortBy: string,
    sortOrder: 'asc' | 'desc',
    query?: string
  ): any[] {
    const orderBy: any[] = [];

    switch (sortBy) {
      case 'relevance':
        if (query) {
          // For relevance, we'll use a combination of factors
          // Note: This is simplified - in production, consider using PostgreSQL's ts_rank
          orderBy.push(
            { views: 'desc' },
            { saves: 'desc' },
            { createdAt: 'desc' }
          );
        } else {
          orderBy.push({ createdAt: 'desc' });
        }
        break;
      case 'price':
        orderBy.push({ price: sortOrder });
        break;
      case 'createdAt':
        orderBy.push({ createdAt: sortOrder });
        break;
      case 'views':
        orderBy.push({ views: sortOrder });
        break;
      case 'saves':
        orderBy.push({ saves: sortOrder });
        break;
      default:
        orderBy.push({ createdAt: 'desc' });
    }

    return orderBy;
  }

  /**
   * Calculate relevance scores for search results
   */
  private calculateRelevanceScores(listings: any[], query: string): any[] {
    const searchTerms = query.toLowerCase().split(/\s+/);
    
    return listings.map(listing => {
      let score = 0;
      const title = listing.title.toLowerCase();
      const description = listing.description.toLowerCase();
      const brand = (listing.brand || '').toLowerCase();
      const model = (listing.model || '').toLowerCase();

      // Title matches (highest weight)
      searchTerms.forEach(term => {
        if (title.includes(term)) score += 10;
        if (title.startsWith(term)) score += 5;
      });

      // Brand/Model matches
      searchTerms.forEach(term => {
        if (brand.includes(term)) score += 8;
        if (model.includes(term)) score += 8;
      });

      // Description matches
      searchTerms.forEach(term => {
        if (description.includes(term)) score += 3;
      });

      // Boost based on engagement
      score += listing.views * 0.01;
      score += listing.saves * 0.1;

      return {
        ...listing,
        relevanceScore: score
      };
    }).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Get search facets for filtering UI
   */
  private async getFacets(filters: SearchFilters): Promise<any> {
    const baseWhere = await this.buildWhereClause(
      { ...filters, categoryId: undefined, condition: undefined },
      false
    );

    // Get category facets
    const categoryFacets = await prisma.listing.groupBy({
      by: ['categoryId'],
      where: baseWhere,
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: 10
    });

    const categories = await prisma.category.findMany({
      where: { id: { in: categoryFacets.map(f => f.categoryId) } },
      select: { id: true, name: true }
    });

    // Get condition facets
    const conditionFacets = await prisma.listing.groupBy({
      by: ['condition'],
      where: baseWhere,
      _count: { condition: true },
      orderBy: { _count: { condition: 'desc' } }
    });

    // Get location facets
    const locationFacets = await prisma.listing.groupBy({
      by: ['city', 'state'],
      where: baseWhere,
      _count: { city: true },
      orderBy: { _count: { city: 'desc' } },
      take: 10
    });

    return {
      categories: categoryFacets.map(f => ({
        id: f.categoryId,
        name: categories.find(c => c.id === f.categoryId)?.name || 'Unknown',
        count: f._count.categoryId
      })),
      conditions: conditionFacets.map(f => ({
        condition: f.condition,
        count: f._count.condition
      })),
      locations: locationFacets.map(f => ({
        city: f.city,
        state: f.state,
        count: f._count.city
      }))
    };
  }

  /**
   * Generate cache key for search results
   */
  private generateCacheKey(filters: SearchFilters, options: SearchOptions): string {
    const key = `search:${JSON.stringify({ filters, options })}`;
    return key.replace(/[^a-zA-Z0-9:_-]/g, '_');
  }

  /**
   * Track search analytics
   */
  private async trackSearchAnalytics(query?: string, categoryId?: string, userId?: string): Promise<void> {
    if (!query) return;

    try {
      // Use the analytics service for comprehensive tracking
      await analyticsService.trackSearch(query, categoryId, userId);
      
      // Legacy tracking for backward compatibility
      const normalizedQuery = query.toLowerCase().trim();
      await redis.zIncrBy(this.POPULAR_SEARCHES_KEY, 1, normalizedQuery);
      
      const analyticsKey = `${this.SEARCH_ANALYTICS_KEY}:${new Date().toISOString().split('T')[0]}`;
      await redis.hIncrBy(analyticsKey, normalizedQuery, 1);
      await redis.expire(analyticsKey, 86400 * 30);
    } catch (error) {
      console.error('Failed to track search analytics:', error);
    }
  }

  /**
   * Get popular search queries
   */
  async getPopularSearches(limit: number = 10): Promise<string[]> {
    try {
      const results = await redis.zRange(this.POPULAR_SEARCHES_KEY, 0, limit - 1, { REV: true });
      return results;
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Get search suggestions based on query
   */
  async getSearchSuggestions(query: string, limit: number = 5): Promise<string[]> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      
      // Get suggestions from popular searches
      const popularSearches = await redis.zRange(this.POPULAR_SEARCHES_KEY, 0, 50, { REV: true });
      const suggestions = popularSearches
        .filter((search: string) => search.includes(normalizedQuery))
        .slice(0, limit);

      // If not enough suggestions, add category and brand suggestions
      if (suggestions.length < limit) {
        const categoryMatches = await prisma.category.findMany({
          where: {
            OR: [
              { name: { contains: query, mode: 'insensitive' } },
              { slug: { contains: query, mode: 'insensitive' } }
            ]
          },
          select: { name: true },
          take: limit - suggestions.length
        });

        suggestions.push(...categoryMatches.map(c => c.name));
      }

      return suggestions.slice(0, limit);
    } catch (error) {
      console.error('Failed to get search suggestions:', error);
      return [];
    }
  }

  /**
   * Clear search cache
   */
  async clearSearchCache(pattern?: string): Promise<void> {
    try {
      const keys = await redis.keys(pattern || 'search:*');
      if (keys.length > 0) {
        await redis.del(keys);
      }
    } catch (error) {
      console.error('Failed to clear search cache:', error);
    }
  }
}

export const searchService = new SearchService();