import { redis } from '@/lib/redis';
import { prisma } from '@/lib/database';

export interface SearchAnalytics {
  query: string;
  count: number;
  lastSearched: Date;
}

export interface CategoryAnalytics {
  categoryId: string;
  categoryName: string;
  searchCount: number;
  listingCount: number;
  viewCount: number;
}

export interface PopularityMetrics {
  popularSearches: SearchAnalytics[];
  popularCategories: CategoryAnalytics[];
  trendingQueries: SearchAnalytics[];
  searchVolume: {
    today: number;
    thisWeek: number;
    thisMonth: number;
  };
}

class AnalyticsService {
  private readonly POPULAR_SEARCHES_KEY = 'analytics:popular_searches';
  private readonly SEARCH_VOLUME_KEY = 'analytics:search_volume';
  private readonly CATEGORY_SEARCHES_KEY = 'analytics:category_searches';
  private readonly TRENDING_QUERIES_KEY = 'analytics:trending_queries';
  private readonly DAILY_ANALYTICS_KEY = 'analytics:daily';

  /**
   * Track a search query
   */
  async trackSearch(query: string, categoryId?: string, userId?: string): Promise<void> {
    try {
      const normalizedQuery = query.toLowerCase().trim();
      const today = new Date().toISOString().split('T')[0];
      const hour = new Date().getHours();

      // Track popular searches
      await redis.zIncrBy(this.POPULAR_SEARCHES_KEY, 1, normalizedQuery);

      // Track search volume by day
      await redis.hIncrBy(`${this.SEARCH_VOLUME_KEY}:${today}`, 'total', 1);
      await redis.expire(`${this.SEARCH_VOLUME_KEY}:${today}`, 86400 * 30); // Keep for 30 days

      // Track hourly search volume
      await redis.hIncrBy(`${this.SEARCH_VOLUME_KEY}:${today}`, `hour_${hour}`, 1);

      // Track category searches if category is provided
      if (categoryId) {
        await redis.zIncrBy(`${this.CATEGORY_SEARCHES_KEY}:${today}`, 1, categoryId);
        await redis.expire(`${this.CATEGORY_SEARCHES_KEY}:${today}`, 86400 * 30);
      }

      // Track trending queries (with time decay)
      const trendingScore = this.calculateTrendingScore();
      await redis.zIncrBy(this.TRENDING_QUERIES_KEY, trendingScore, normalizedQuery);

      // Clean up old trending data (keep only last 7 days worth)
      await this.cleanupTrendingData();

      // Track user search patterns if user is provided
      if (userId) {
        await this.trackUserSearchPattern(userId, normalizedQuery, categoryId);
      }
    } catch (error) {
      console.error('Failed to track search analytics:', error);
    }
  }

  /**
   * Track category view/interaction
   */
  async trackCategoryView(categoryId: string, userId?: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Track category views
      await redis.zIncrBy(`analytics:category_views:${today}`, 1, categoryId);
      await redis.expire(`analytics:category_views:${today}`, 86400 * 30);

      // Track user category preferences if user is provided
      if (userId) {
        await redis.zIncrBy(`analytics:user_categories:${userId}`, 1, categoryId);
        await redis.expire(`analytics:user_categories:${userId}`, 86400 * 90); // Keep for 90 days
      }
    } catch (error) {
      console.error('Failed to track category view:', error);
    }
  }

  /**
   * Get popular searches
   */
  async getPopularSearches(limit: number = 10): Promise<SearchAnalytics[]> {
    try {
      const results = await redis.zRangeWithScores(this.POPULAR_SEARCHES_KEY, 0, limit - 1, { REV: true });
      
      return results.map((item: any) => ({
        query: item.value,
        count: item.score,
        lastSearched: new Date() // This would need to be tracked separately for accuracy
      }));
    } catch (error) {
      console.error('Failed to get popular searches:', error);
      return [];
    }
  }

  /**
   * Get trending queries (queries gaining popularity)
   */
  async getTrendingQueries(limit: number = 10): Promise<SearchAnalytics[]> {
    try {
      const results = await redis.zRangeWithScores(this.TRENDING_QUERIES_KEY, 0, limit - 1, { REV: true });
      
      return results.map((item: any) => ({
        query: item.value,
        count: Math.round(item.score),
        lastSearched: new Date()
      }));
    } catch (error) {
      console.error('Failed to get trending queries:', error);
      return [];
    }
  }

  /**
   * Get popular categories with analytics
   */
  async getPopularCategories(limit: number = 10): Promise<CategoryAnalytics[]> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Get category search counts
      const searchCounts = await redis.zRangeWithScores(`${this.CATEGORY_SEARCHES_KEY}:${today}`, 0, limit - 1, { REV: true });
      
      // Get category view counts
      const viewCounts = await redis.zRangeWithScores(`analytics:category_views:${today}`, 0, limit - 1, { REV: true });
      
      // Get category listing counts from database
      const categories = await prisma.category.findMany({
        include: {
          _count: {
            select: {
              listings: {
                where: {
                  status: 'LIVE',
                  isActive: true
                }
              }
            }
          }
        }
      });

      // Combine all metrics
      const categoryMap = new Map<string, CategoryAnalytics>();
      
      // Initialize with database data
      categories.forEach(category => {
        categoryMap.set(category.id, {
          categoryId: category.id,
          categoryName: category.name,
          searchCount: 0,
          listingCount: category._count.listings,
          viewCount: 0
        });
      });

      // Add search counts
      searchCounts.forEach((item: any) => {
        const existing = categoryMap.get(item.value);
        if (existing) {
          existing.searchCount = item.score;
        }
      });

      // Add view counts
      viewCounts.forEach((item: any) => {
        const existing = categoryMap.get(item.value);
        if (existing) {
          existing.viewCount = item.score;
        }
      });

      // Sort by combined popularity score
      const result = Array.from(categoryMap.values())
        .map(category => ({
          ...category,
          popularityScore: (category.searchCount * 2) + category.viewCount + (category.listingCount * 0.1)
        }))
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, limit);

      return result;
    } catch (error) {
      console.error('Failed to get popular categories:', error);
      return [];
    }
  }

  /**
   * Get search volume metrics
   */
  async getSearchVolume(): Promise<{ today: number; thisWeek: number; thisMonth: number }> {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      // Get today's volume
      const todayVolume = await redis.hGet(`${this.SEARCH_VOLUME_KEY}:${todayStr}`, 'total');
      
      // Get this week's volume
      let weekVolume = 0;
      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayVolume = await redis.hGet(`${this.SEARCH_VOLUME_KEY}:${dateStr}`, 'total');
        weekVolume += parseInt(dayVolume || '0');
      }

      // Get this month's volume
      let monthVolume = 0;
      for (let i = 0; i < 30; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        const dayVolume = await redis.hGet(`${this.SEARCH_VOLUME_KEY}:${dateStr}`, 'total');
        monthVolume += parseInt(dayVolume || '0');
      }

      return {
        today: parseInt(todayVolume || '0'),
        thisWeek: weekVolume,
        thisMonth: monthVolume
      };
    } catch (error) {
      console.error('Failed to get search volume:', error);
      return { today: 0, thisWeek: 0, thisMonth: 0 };
    }
  }

  /**
   * Get comprehensive popularity metrics
   */
  async getPopularityMetrics(limit: number = 10): Promise<PopularityMetrics> {
    try {
      const [popularSearches, popularCategories, trendingQueries, searchVolume] = await Promise.all([
        this.getPopularSearches(limit),
        this.getPopularCategories(limit),
        this.getTrendingQueries(limit),
        this.getSearchVolume()
      ]);

      return {
        popularSearches,
        popularCategories,
        trendingQueries,
        searchVolume
      };
    } catch (error) {
      console.error('Failed to get popularity metrics:', error);
      return {
        popularSearches: [],
        popularCategories: [],
        trendingQueries: [],
        searchVolume: { today: 0, thisWeek: 0, thisMonth: 0 }
      };
    }
  }

  /**
   * Get user search recommendations based on their history
   */
  async getUserSearchRecommendations(userId: string, limit: number = 5): Promise<string[]> {
    try {
      // Get user's category preferences
      const userCategories = await redis.zRange(`analytics:user_categories:${userId}`, 0, 5, { REV: true });
      
      // Get popular searches in those categories
      const recommendations = new Set<string>();
      
      for (const categoryId of userCategories) {
        // This would need more sophisticated logic to map categories to search terms
        // For now, we'll use popular searches as fallback
        const popular = await this.getPopularSearches(limit * 2);
        popular.forEach(search => recommendations.add(search.query));
        
        if (recommendations.size >= limit) break;
      }

      return Array.from(recommendations).slice(0, limit);
    } catch (error) {
      console.error('Failed to get user search recommendations:', error);
      return [];
    }
  }

  /**
   * Calculate trending score with time decay
   */
  private calculateTrendingScore(): number {
    const now = Date.now();
    const hoursSinceEpoch = now / (1000 * 60 * 60);
    
    // Higher score for more recent searches
    return Math.floor(hoursSinceEpoch);
  }

  /**
   * Track user search patterns
   */
  private async trackUserSearchPattern(userId: string, query: string, categoryId?: string): Promise<void> {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Track user's search history
      await redis.zAdd(`analytics:user_searches:${userId}`, {
        score: Date.now(),
        value: query
      });
      
      // Keep only last 100 searches per user
      await redis.zRemRangeByRank(`analytics:user_searches:${userId}`, 0, -101);
      
      // Set expiry for user data
      await redis.expire(`analytics:user_searches:${userId}`, 86400 * 90); // 90 days
    } catch (error) {
      console.error('Failed to track user search pattern:', error);
    }
  }

  /**
   * Clean up old trending data
   */
  private async cleanupTrendingData(): Promise<void> {
    try {
      const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weekAgoScore = Math.floor(weekAgo / (1000 * 60 * 60));
      
      // Remove trending queries older than a week
      await redis.zRemRangeByScore(this.TRENDING_QUERIES_KEY, 0, weekAgoScore);
    } catch (error) {
      console.error('Failed to cleanup trending data:', error);
    }
  }

  /**
   * Clear analytics data (admin function)
   */
  async clearAnalytics(type?: 'searches' | 'categories' | 'all'): Promise<void> {
    try {
      const patterns: string[] = [];
      
      switch (type) {
        case 'searches':
          patterns.push('analytics:popular_searches*', 'analytics:search_volume*', 'analytics:trending_queries*');
          break;
        case 'categories':
          patterns.push('analytics:category_*');
          break;
        case 'all':
        default:
          patterns.push('analytics:*');
          break;
      }

      for (const pattern of patterns) {
        const keys = await redis.keys(pattern);
        if (keys.length > 0) {
          await redis.del(keys);
        }
      }
    } catch (error) {
      console.error('Failed to clear analytics:', error);
    }
  }
}

export const analyticsService = new AnalyticsService();