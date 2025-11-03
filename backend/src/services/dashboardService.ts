import { prisma } from '@/lib/database';
import { redis } from '@/lib/redis';

export interface DashboardStats {
  totalViews: number;
  totalMessages: number;
  totalSaves: number;
  totalListings: number;
  activeListings: number;
  soldListings: number;
  conversionRate: string;
}

export interface ListingAnalytics {
  listingId: string;
  title: string;
  views: number;
  messages: number;
  saves: number;
  quotes: number;
  conversionRate: string;
  saveRate: string;
  createdAt: Date;
}

export interface QuoteAnalytics {
  totalQuotes: number;
  pendingQuotes: number;
  acceptedQuotes: number;
  rejectedQuotes: number;
  acceptanceRate: string;
}

class DashboardService {
  /**
   * Get comprehensive seller dashboard statistics
   */
  async getSellerDashboardStats(userId: string): Promise<DashboardStats> {
    const [
      totalListings,
      activeListings,
      soldListings,
      totalViews,
      totalSaves,
      totalMessages
    ] = await Promise.all([
      prisma.listing.count({
        where: { sellerId: userId, isActive: true }
      }),
      
      prisma.listing.count({
        where: { sellerId: userId, status: 'LIVE', isActive: true }
      }),
      
      prisma.listing.count({
        where: { sellerId: userId, status: 'SOLD', isActive: true }
      }),
      
      prisma.listing.aggregate({
        where: { sellerId: userId, isActive: true },
        _sum: { views: true }
      }),
      
      prisma.listing.aggregate({
        where: { sellerId: userId, isActive: true },
        _sum: { saves: true }
      }),
      
      prisma.message.count({
        where: { receiverId: userId }
      })
    ]);

    const conversionRate = totalListings > 0 
      ? ((soldListings / totalListings) * 100).toFixed(1)
      : '0';

    return {
      totalViews: totalViews._sum.views || 0,
      totalMessages,
      totalSaves: totalSaves._sum.saves || 0,
      totalListings,
      activeListings,
      soldListings,
      conversionRate
    };
  }

  /**
   * Get detailed analytics for seller's listings
   */
  async getSellerListingAnalytics(userId: string, limit: number = 10): Promise<ListingAnalytics[]> {
    const listings = await prisma.listing.findMany({
      where: { sellerId: userId, isActive: true },
      select: {
        id: true,
        title: true,
        views: true,
        saves: true,
        createdAt: true,
        _count: {
          select: {
            messages: true,
            savedBy: true
          }
        }
      },
      orderBy: { views: 'desc' },
      take: limit
    });

    const analyticsPromises = listings.map(async (listing) => {
      const quoteCount = await prisma.message.count({
        where: {
          listingId: listing.id,
          messageType: 'QUOTE'
        }
      });

      const conversionRate = listing.views > 0 
        ? ((listing._count.messages / listing.views) * 100).toFixed(1)
        : '0';

      const saveRate = listing.views > 0 
        ? ((listing._count.savedBy / listing.views) * 100).toFixed(1)
        : '0';

      return {
        listingId: listing.id,
        title: listing.title,
        views: listing.views,
        messages: listing._count.messages,
        saves: listing._count.savedBy,
        quotes: quoteCount,
        conversionRate,
        saveRate,
        createdAt: listing.createdAt
      };
    });

    return Promise.all(analyticsPromises);
  }

  /**
   * Get quote analytics for user
   */
  async getQuoteAnalytics(userId: string, type: 'sent' | 'received' = 'received'): Promise<QuoteAnalytics> {
    const whereClause = type === 'sent' 
      ? { senderId: userId, messageType: 'QUOTE' as const }
      : { receiverId: userId, messageType: 'QUOTE' as const };

    const [
      totalQuotes,
      pendingQuotes,
      acceptedQuotes,
      rejectedQuotes
    ] = await Promise.all([
      prisma.message.count({ where: whereClause }),
      
      prisma.message.count({
        where: { ...whereClause, quoteStatus: 'PENDING' }
      }),
      
      prisma.message.count({
        where: { ...whereClause, quoteStatus: 'ACCEPTED' }
      }),
      
      prisma.message.count({
        where: { ...whereClause, quoteStatus: 'REJECTED' }
      })
    ]);

    const acceptanceRate = totalQuotes > 0 
      ? ((acceptedQuotes / totalQuotes) * 100).toFixed(1)
      : '0';

    return {
      totalQuotes,
      pendingQuotes,
      acceptedQuotes,
      rejectedQuotes,
      acceptanceRate
    };
  }

  /**
   * Get trending listings for seller
   */
  async getTrendingListings(userId: string, days: number = 7): Promise<any[]> {
    const dateFrom = new Date();
    dateFrom.setDate(dateFrom.getDate() - days);

    // Get listings with recent activity
    const listings = await prisma.listing.findMany({
      where: {
        sellerId: userId,
        isActive: true,
        status: 'LIVE',
        updatedAt: {
          gte: dateFrom
        }
      },
      include: {
        category: {
          select: { name: true }
        },
        _count: {
          select: {
            messages: {
              where: {
                createdAt: {
                  gte: dateFrom
                }
              }
            },
            savedBy: {
              where: {
                createdAt: {
                  gte: dateFrom
                }
              }
            }
          }
        }
      },
      orderBy: [
        { views: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: 5
    });

    return listings.map(listing => ({
      id: listing.id,
      title: listing.title,
      price: listing.price,
      views: listing.views,
      recentMessages: listing._count.messages,
      recentSaves: listing._count.savedBy,
      category: listing.category.name,
      trendScore: (listing.views * 0.3) + (listing._count.messages * 2) + (listing._count.savedBy * 1.5)
    }));
  }

  /**
   * Get buyer activity summary
   */
  async getBuyerActivitySummary(userId: string): Promise<any> {
    const [
      savedListings,
      sentMessages,
      sentQuotes,
      activeConversations
    ] = await Promise.all([
      prisma.savedListing.count({
        where: { userId }
      }),
      
      prisma.message.count({
        where: { senderId: userId }
      }),
      
      prisma.message.count({
        where: { senderId: userId, messageType: 'QUOTE' }
      }),
      
      prisma.message.findMany({
        where: { senderId: userId },
        select: { conversationId: true },
        distinct: ['conversationId']
      })
    ]);

    return {
      savedListings,
      sentMessages,
      sentQuotes,
      activeConversations: activeConversations.length
    };
  }

  /**
   * Get recent activity feed for dashboard
   */
  async getRecentActivity(userId: string, limit: number = 10): Promise<any[]> {
    // Get recent messages, saves, and listing updates
    const [recentMessages, recentSaves, recentListingUpdates] = await Promise.all([
      prisma.message.findMany({
        where: {
          OR: [
            { senderId: userId },
            { receiverId: userId }
          ]
        },
        include: {
          sender: {
            select: { firstName: true, lastName: true }
          },
          receiver: {
            select: { firstName: true, lastName: true }
          },
          listing: {
            select: { title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      }),
      
      prisma.savedListing.findMany({
        where: { userId },
        include: {
          listing: {
            select: { title: true, price: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 3
      }),
      
      prisma.listing.findMany({
        where: { sellerId: userId },
        select: {
          id: true,
          title: true,
          status: true,
          updatedAt: true
        },
        orderBy: { updatedAt: 'desc' },
        take: 3
      })
    ]);

    // Combine and sort all activities
    const activities: any[] = [];

    recentMessages.forEach(message => {
      activities.push({
        type: 'message',
        timestamp: message.createdAt,
        description: `${message.messageType === 'QUOTE' ? 'Quote' : 'Message'} ${message.senderId === userId ? 'sent to' : 'received from'} ${message.senderId === userId ? message.receiver.firstName : message.sender.firstName}`,
        relatedItem: message.listing.title,
        data: message
      });
    });

    recentSaves.forEach(save => {
      activities.push({
        type: 'save',
        timestamp: save.createdAt,
        description: `Saved "${save.listing.title}"`,
        relatedItem: `₹${save.listing.price}`,
        data: save
      });
    });

    recentListingUpdates.forEach(listing => {
      activities.push({
        type: 'listing_update',
        timestamp: listing.updatedAt,
        description: `Listing "${listing.title}" status: ${listing.status}`,
        relatedItem: listing.status,
        data: listing
      });
    });

    return activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  /**
   * Cache dashboard data for performance
   */
  async cacheDashboardData(userId: string, type: 'seller' | 'buyer', data: any): Promise<void> {
    try {
      const cacheKey = `dashboard:${type}:${userId}`;
      await redis.setEx(cacheKey, 300, JSON.stringify(data)); // Cache for 5 minutes
    } catch (error) {
      console.error('Failed to cache dashboard data:', error);
    }
  }

  /**
   * Get cached dashboard data
   */
  async getCachedDashboardData(userId: string, type: 'seller' | 'buyer'): Promise<any | null> {
    try {
      const cacheKey = `dashboard:${type}:${userId}`;
      const cached = await redis.get(cacheKey);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Failed to get cached dashboard data:', error);
      return null;
    }
  }
}

export const dashboardService = new DashboardService();