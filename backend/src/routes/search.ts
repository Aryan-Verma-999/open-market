import express from 'express';
import { searchService } from '@/services/searchService';
import { analyticsService } from '@/services/analyticsService';
import { Condition } from '@prisma/client';

const router = express.Router();

/**
 * Advanced search endpoint
 * GET /api/search
 */
router.get('/', async (req, res) => {
  try {
    const {
      // Text search
      q: query,
      
      // Category filters
      categoryId,
      categoryIds,
      
      // Location filters
      city,
      state,
      latitude,
      longitude,
      radius,
      
      // Price filters
      minPrice,
      maxPrice,
      
      // Condition filters
      condition,
      conditions,
      
      // Date filters
      createdAfter,
      createdBefore,
      
      // Other filters
      sellerId,
      negotiable,
      pickupOnly,
      canArrangeShipping,
      
      // Pagination and sorting
      page = '1',
      limit = '20',
      sortBy = 'relevance',
      sortOrder = 'desc',
      
      // Options
      includeInactive = 'false'
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PAGE',
          message: 'Page must be a positive integer'
        }
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100'
        }
      });
    }

    // Validate sort parameters
    const validSortBy = ['relevance', 'price', 'createdAt', 'views', 'saves'];
    if (!validSortBy.includes(sortBy as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_BY',
          message: `Sort by must be one of: ${validSortBy.join(', ')}`
        }
      });
    }

    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_ORDER',
          message: 'Sort order must be "asc" or "desc"'
        }
      });
    }

    // Build filters object
    const filters: any = {};

    if (query) filters.query = query as string;
    if (categoryId) filters.categoryId = categoryId as string;
    if (categoryIds) {
      const categoryIdArray = Array.isArray(categoryIds) 
        ? categoryIds as string[]
        : (categoryIds as string).split(',');
      filters.categoryIds = categoryIdArray;
    }

    // Location filters
    if (city) filters.city = city as string;
    if (state) filters.state = state as string;
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      if (!isNaN(lat) && !isNaN(lng)) {
        filters.latitude = lat;
        filters.longitude = lng;
        
        if (radius) {
          const radiusNum = parseFloat(radius as string);
          if (!isNaN(radiusNum) && radiusNum > 0) {
            filters.radius = radiusNum;
          }
        }
      }
    }

    // Price filters
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      if (!isNaN(min) && min >= 0) filters.minPrice = min;
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      if (!isNaN(max) && max >= 0) filters.maxPrice = max;
    }

    // Condition filters
    if (condition && Object.values(Condition).includes(condition as Condition)) {
      filters.condition = condition as Condition;
    }
    if (conditions) {
      const conditionArray = Array.isArray(conditions)
        ? conditions as string[]
        : (conditions as string).split(',');
      const validConditions = conditionArray.filter(c => 
        Object.values(Condition).includes(c as Condition)
      ) as Condition[];
      if (validConditions.length > 0) {
        filters.conditions = validConditions;
      }
    }

    // Date filters
    if (createdAfter) {
      const date = new Date(createdAfter as string);
      if (!isNaN(date.getTime())) filters.createdAfter = date;
    }
    if (createdBefore) {
      const date = new Date(createdBefore as string);
      if (!isNaN(date.getTime())) filters.createdBefore = date;
    }

    // Other filters
    if (sellerId) filters.sellerId = sellerId as string;
    if (negotiable !== undefined) filters.negotiable = negotiable === 'true';
    if (pickupOnly !== undefined) filters.pickupOnly = pickupOnly === 'true';
    if (canArrangeShipping !== undefined) filters.canArrangeShipping = canArrangeShipping === 'true';

    // Search options
    const options = {
      page: pageNum,
      limit: limitNum,
      sortBy: sortBy as any,
      sortOrder: sortOrder as 'asc' | 'desc',
      includeInactive: includeInactive === 'true'
    };

    // Get user ID from auth if available
    const userId = (req as any).user?.id;

    const result = await searchService.searchListings(filters, options, userId);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Search error:', error);
    res.status(500).json({
      error: {
        code: 'SEARCH_FAILED',
        message: error.message || 'Search request failed'
      }
    });
  }
});

/**
 * Get search suggestions
 * GET /api/search/suggestions
 */
router.get('/suggestions', async (req, res) => {
  try {
    const { q: query, limit = '5' } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: {
          code: 'MISSING_QUERY',
          message: 'Query parameter is required'
        }
      });
    }

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 20) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 20'
        }
      });
    }

    const suggestions = await searchService.getSearchSuggestions(query, limitNum);

    res.json({
      success: true,
      data: {
        query,
        suggestions
      }
    });
  } catch (error: any) {
    console.error('Search suggestions error:', error);
    res.status(500).json({
      error: {
        code: 'SUGGESTIONS_FAILED',
        message: error.message || 'Failed to get search suggestions'
      }
    });
  }
});

/**
 * Get popular searches
 * GET /api/search/popular
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 50'
        }
      });
    }

    const popularSearches = await searchService.getPopularSearches(limitNum);

    res.json({
      success: true,
      data: {
        popularSearches
      }
    });
  } catch (error: any) {
    console.error('Popular searches error:', error);
    res.status(500).json({
      error: {
        code: 'POPULAR_SEARCHES_FAILED',
        message: error.message || 'Failed to get popular searches'
      }
    });
  }
});

/**
 * Infinite scroll search endpoint
 * GET /api/search/scroll
 */
router.get('/scroll', async (req, res) => {
  try {
    const {
      // Text search
      q: query,
      
      // Category filters
      categoryId,
      categoryIds,
      
      // Location filters
      city,
      state,
      latitude,
      longitude,
      radius,
      
      // Price filters
      minPrice,
      maxPrice,
      
      // Condition filters
      condition,
      conditions,
      
      // Date filters
      createdAfter,
      createdBefore,
      
      // Other filters
      sellerId,
      negotiable,
      pickupOnly,
      canArrangeShipping,
      
      // Cursor pagination
      cursor,
      limit = '20',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Validate parameters
    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 100'
        }
      });
    }

    const validSortBy = ['relevance', 'price', 'createdAt', 'views', 'saves'];
    if (!validSortBy.includes(sortBy as string)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_BY',
          message: `Sort by must be one of: ${validSortBy.join(', ')}`
        }
      });
    }

    if (sortOrder !== 'asc' && sortOrder !== 'desc') {
      return res.status(400).json({
        error: {
          code: 'INVALID_SORT_ORDER',
          message: 'Sort order must be "asc" or "desc"'
        }
      });
    }

    // Build filters object (same as regular search)
    const filters: any = {};

    if (query) filters.query = query as string;
    if (categoryId) filters.categoryId = categoryId as string;
    if (categoryIds) {
      const categoryIdArray = Array.isArray(categoryIds) 
        ? categoryIds as string[]
        : (categoryIds as string).split(',');
      filters.categoryIds = categoryIdArray;
    }

    // Location filters
    if (city) filters.city = city as string;
    if (state) filters.state = state as string;
    if (latitude && longitude) {
      const lat = parseFloat(latitude as string);
      const lng = parseFloat(longitude as string);
      if (!isNaN(lat) && !isNaN(lng)) {
        filters.latitude = lat;
        filters.longitude = lng;
        
        if (radius) {
          const radiusNum = parseFloat(radius as string);
          if (!isNaN(radiusNum) && radiusNum > 0) {
            filters.radius = radiusNum;
          }
        }
      }
    }

    // Price filters
    if (minPrice) {
      const min = parseFloat(minPrice as string);
      if (!isNaN(min) && min >= 0) filters.minPrice = min;
    }
    if (maxPrice) {
      const max = parseFloat(maxPrice as string);
      if (!isNaN(max) && max >= 0) filters.maxPrice = max;
    }

    // Condition filters
    if (condition && Object.values(Condition).includes(condition as Condition)) {
      filters.condition = condition as Condition;
    }
    if (conditions) {
      const conditionArray = Array.isArray(conditions)
        ? conditions as string[]
        : (conditions as string).split(',');
      const validConditions = conditionArray.filter(c => 
        Object.values(Condition).includes(c as Condition)
      ) as Condition[];
      if (validConditions.length > 0) {
        filters.conditions = validConditions;
      }
    }

    // Date filters
    if (createdAfter) {
      const date = new Date(createdAfter as string);
      if (!isNaN(date.getTime())) filters.createdAfter = date;
    }
    if (createdBefore) {
      const date = new Date(createdBefore as string);
      if (!isNaN(date.getTime())) filters.createdBefore = date;
    }

    // Other filters
    if (sellerId) filters.sellerId = sellerId as string;
    if (negotiable !== undefined) filters.negotiable = negotiable === 'true';
    if (pickupOnly !== undefined) filters.pickupOnly = pickupOnly === 'true';
    if (canArrangeShipping !== undefined) filters.canArrangeShipping = canArrangeShipping === 'true';

    // Get user ID from auth if available
    const userId = (req as any).user?.id;

    const result = await searchService.searchListingsWithCursor(
      filters,
      cursor as string,
      limitNum,
      sortBy as string,
      sortOrder as 'asc' | 'desc',
      userId
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('Infinite scroll search error:', error);
    res.status(500).json({
      error: {
        code: 'SCROLL_SEARCH_FAILED',
        message: error.message || 'Infinite scroll search failed'
      }
    });
  }
});

/**
 * Get search analytics and trending data
 * GET /api/search/analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 50'
        }
      });
    }

    const analytics = await analyticsService.getPopularityMetrics(limitNum);

    res.json({
      success: true,
      data: analytics
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    res.status(500).json({
      error: {
        code: 'ANALYTICS_FAILED',
        message: error.message || 'Failed to get search analytics'
      }
    });
  }
});

/**
 * Get trending queries
 * GET /api/search/trending
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = '10' } = req.query;

    const limitNum = parseInt(limit as string);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 50) {
      return res.status(400).json({
        error: {
          code: 'INVALID_LIMIT',
          message: 'Limit must be between 1 and 50'
        }
      });
    }

    const trendingQueries = await analyticsService.getTrendingQueries(limitNum);

    res.json({
      success: true,
      data: {
        trendingQueries
      }
    });
  } catch (error: any) {
    console.error('Trending queries error:', error);
    res.status(500).json({
      error: {
        code: 'TRENDING_FAILED',
        message: error.message || 'Failed to get trending queries'
      }
    });
  }
});

/**
 * Clear search cache (admin only)
 * DELETE /api/search/cache
 */
router.delete('/cache', async (req, res) => {
  try {
    // TODO: Add admin authentication middleware
    const { pattern } = req.query;

    await searchService.clearSearchCache(pattern as string);

    res.json({
      success: true,
      message: 'Search cache cleared successfully'
    });
  } catch (error: any) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      error: {
        code: 'CACHE_CLEAR_FAILED',
        message: error.message || 'Failed to clear search cache'
      }
    });
  }
});

export default router;