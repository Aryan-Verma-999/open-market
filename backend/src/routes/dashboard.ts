import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { prisma } from '@/lib/database';
import { analyticsService } from '@/services/analyticsService';

const router = Router();

/**
 * GET /api/dashboard/seller
 * Get seller dashboard data with statistics and listings
 */
router.get('/seller', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 10 } = req.query;

    // Get seller statistics
    const [
      totalListings,
      activeListings,
      soldListings,
      draftListings,
      totalViews,
      totalSaves,
      totalMessages,
      recentListings
    ] = await Promise.all([
      // Total listings count
      prisma.listing.count({
        where: { sellerId: userId, isActive: true }
      }),
      
      // Active listings count
      prisma.listing.count({
        where: { sellerId: userId, status: 'LIVE', isActive: true }
      }),
      
      // Sold listings count
      prisma.listing.count({
        where: { sellerId: userId, status: 'SOLD', isActive: true }
      }),
      
      // Draft listings count
      prisma.listing.count({
        where: { sellerId: userId, status: 'DRAFT', isActive: true }
      }),
      
      // Total views across all listings
      prisma.listing.aggregate({
        where: { sellerId: userId, isActive: true },
        _sum: { views: true }
      }),
      
      // Total saves across all listings
      prisma.listing.aggregate({
        where: { sellerId: userId, isActive: true },
        _sum: { saves: true }
      }),
      
      // Total messages received
      prisma.message.count({
        where: { receiverId: userId }
      }),
      
      // Recent listings with analytics
      prisma.listing.findMany({
        where: { sellerId: userId, isActive: true },
        include: {
          category: {
            select: { name: true }
          },
          _count: {
            select: {
              messages: true,
              savedBy: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      })
    ]);

    // Get recent messages for seller
    const recentMessages = await prisma.message.findMany({
      where: { receiverId: userId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    // Get quotes received
    const quotes = await prisma.message.findMany({
      where: {
        receiverId: userId,
        messageType: 'QUOTE'
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
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    const statistics = {
      totalListings,
      activeListings,
      soldListings,
      draftListings,
      totalViews: totalViews._sum.views || 0,
      totalSaves: totalSaves._sum.saves || 0,
      totalMessages,
      conversionRate: totalListings > 0 ? ((soldListings / totalListings) * 100).toFixed(1) : '0'
    };

    res.json({
      message: 'Seller dashboard data retrieved successfully',
      data: {
        statistics,
        listings: recentListings,
        recentMessages,
        quotes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalListings,
          totalPages: Math.ceil(totalListings / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get seller dashboard error:', error);
    res.status(500).json({
      error: {
        code: 'SELLER_DASHBOARD_FETCH_FAILED',
        message: 'Failed to retrieve seller dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/dashboard/buyer
 * Get buyer dashboard data with saved items and messages
 */
router.get('/buyer', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { page = 1, limit = 10 } = req.query;

    // Get buyer statistics
    const [
      totalSavedItems,
      totalMessages,
      totalQuotes,
      pendingQuotes,
      savedListings,
      recentMessages
    ] = await Promise.all([
      // Total saved items
      prisma.savedListing.count({
        where: { userId }
      }),
      
      // Total messages sent
      prisma.message.count({
        where: { senderId: userId }
      }),
      
      // Total quotes sent
      prisma.message.count({
        where: { senderId: userId, messageType: 'QUOTE' }
      }),
      
      // Pending quotes
      prisma.message.count({
        where: { 
          senderId: userId, 
          messageType: 'QUOTE',
          quoteStatus: 'PENDING'
        }
      }),
      
      // Recent saved listings
      prisma.savedListing.findMany({
        where: { userId },
        include: {
          listing: {
            include: {
              seller: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  company: true,
                  trustScore: true
                }
              },
              category: {
                select: { name: true }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      
      // Recent messages sent
      prisma.message.findMany({
        where: { senderId: userId },
        include: {
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true
            }
          },
          listing: {
            select: {
              id: true,
              title: true,
              images: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // Get quote status breakdown
    const quotesByStatus = await prisma.message.groupBy({
      by: ['quoteStatus'],
      where: {
        senderId: userId,
        messageType: 'QUOTE'
      },
      _count: {
        id: true
      }
    });

    const statistics = {
      totalSavedItems,
      totalMessages,
      totalQuotes,
      pendingQuotes,
      acceptedQuotes: quotesByStatus.find(q => q.quoteStatus === 'ACCEPTED')?._count.id || 0,
      rejectedQuotes: quotesByStatus.find(q => q.quoteStatus === 'REJECTED')?._count.id || 0
    };

    res.json({
      message: 'Buyer dashboard data retrieved successfully',
      data: {
        statistics,
        savedListings: savedListings.map(saved => saved.listing),
        recentMessages,
        quotesByStatus,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: totalSavedItems,
          totalPages: Math.ceil(totalSavedItems / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('Get buyer dashboard error:', error);
    res.status(500).json({
      error: {
        code: 'BUYER_DASHBOARD_FETCH_FAILED',
        message: 'Failed to retrieve buyer dashboard data',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/dashboard/analytics/:listingId
 * Get detailed analytics for a specific listing
 */
router.get('/analytics/:listingId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { listingId } = req.params;
    const userId = req.user!.id;

    // Verify listing ownership
    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        sellerId: userId,
        isActive: true
      }
    });

    if (!listing) {
      return res.status(404).json({
        error: {
          code: 'LISTING_NOT_FOUND',
          message: 'Listing not found or access denied',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get detailed analytics
    const [
      messageCount,
      saveCount,
      quoteCount,
      uniqueViewers,
      messages
    ] = await Promise.all([
      // Total messages for this listing
      prisma.message.count({
        where: { listingId }
      }),
      
      // Total saves
      prisma.savedListing.count({
        where: { listingId }
      }),
      
      // Total quotes
      prisma.message.count({
        where: { listingId, messageType: 'QUOTE' }
      }),
      
      // Unique viewers (approximate - based on unique message senders)
      prisma.message.findMany({
        where: { listingId },
        select: { senderId: true },
        distinct: ['senderId']
      }),
      
      // Recent messages for this listing
      prisma.message.findMany({
        where: { listingId },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    const analytics = {
      views: listing.views,
      saves: saveCount,
      messages: messageCount,
      quotes: quoteCount,
      uniqueViewers: uniqueViewers.length,
      conversionRate: listing.views > 0 ? ((messageCount / listing.views) * 100).toFixed(1) : '0',
      saveRate: listing.views > 0 ? ((saveCount / listing.views) * 100).toFixed(1) : '0'
    };

    res.json({
      message: 'Listing analytics retrieved successfully',
      data: {
        listing: {
          id: listing.id,
          title: listing.title,
          price: listing.price,
          status: listing.status,
          createdAt: listing.createdAt
        },
        analytics,
        recentMessages: messages
      }
    });
  } catch (error) {
    console.error('Get listing analytics error:', error);
    res.status(500).json({
      error: {
        code: 'LISTING_ANALYTICS_FETCH_FAILED',
        message: 'Failed to retrieve listing analytics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/dashboard/quotes
 * Get all quotes for the user (both sent and received)
 */
router.get('/quotes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { type = 'all', status, page = 1, limit = 10 } = req.query;

    let whereClause: any = {
      messageType: 'QUOTE'
    };

    // Filter by type (sent/received)
    if (type === 'sent') {
      whereClause.senderId = userId;
    } else if (type === 'received') {
      whereClause.receiverId = userId;
    } else {
      whereClause.OR = [
        { senderId: userId },
        { receiverId: userId }
      ];
    }

    // Filter by status
    if (status && status !== 'all') {
      whereClause.quoteStatus = status;
    }

    const [quotes, total] = await Promise.all([
      prisma.message.findMany({
        where: whereClause,
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
          },
          listing: {
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              status: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit)
      }),
      
      prisma.message.count({ where: whereClause })
    ]);

    res.json({
      message: 'Quotes retrieved successfully',
      data: {
        quotes,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages: Math.ceil(total / Number(limit)),
          hasNext: Number(page) < Math.ceil(total / Number(limit)),
          hasPrev: Number(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('Get quotes error:', error);
    res.status(500).json({
      error: {
        code: 'QUOTES_FETCH_FAILED',
        message: 'Failed to retrieve quotes',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/dashboard/quotes/:quoteId/status
 * Update quote status (accept/reject/counter)
 */
router.put('/quotes/:quoteId/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { quoteId } = req.params;
    const { status, counterAmount, counterTerms } = req.body;
    const userId = req.user!.id;

    if (!['ACCEPTED', 'REJECTED', 'COUNTERED'].includes(status)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_QUOTE_STATUS',
          message: 'Invalid quote status',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Verify quote exists and user is the receiver
    const quote = await prisma.message.findFirst({
      where: {
        id: quoteId,
        receiverId: userId,
        messageType: 'QUOTE'
      },
      include: {
        listing: true,
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });

    if (!quote) {
      return res.status(404).json({
        error: {
          code: 'QUOTE_NOT_FOUND',
          message: 'Quote not found or access denied',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update quote status
    const updatedQuote = await prisma.message.update({
      where: { id: quoteId },
      data: {
        quoteStatus: status,

      }
    });

    // If countering, create a new counter quote
    if (status === 'COUNTERED' && counterAmount) {
      await prisma.message.create({
        data: {
          conversationId: quote.conversationId,
          senderId: userId,
          receiverId: quote.senderId,
          listingId: quote.listingId,
          content: `Counter offer: ₹${counterAmount}${counterTerms ? ` - ${counterTerms}` : ''}`,
          messageType: 'QUOTE',
          quoteAmount: counterAmount,
          quoteTerms: counterTerms,
          quoteStatus: 'PENDING'
        }
      });
    }

    // Create notification for the quote sender
    await prisma.notification.create({
      data: {
        userId: quote.senderId,
        type: 'QUOTE',
        title: `Quote ${status.toLowerCase()}`,
        message: `Your quote for "${quote.listing.title}" has been ${status.toLowerCase()}`,
        data: {
          quoteId,
          listingId: quote.listingId,
          status
        }
      }
    });

    res.json({
      message: 'Quote status updated successfully',
      data: { quote: updatedQuote }
    });
  } catch (error) {
    console.error('Update quote status error:', error);
    res.status(500).json({
      error: {
        code: 'QUOTE_STATUS_UPDATE_FAILED',
        message: 'Failed to update quote status',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;