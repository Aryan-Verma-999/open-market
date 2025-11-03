import { Router, Request, Response } from 'express';
import { AuthService } from '@/services/authService';
import { validateRequest } from '@/utils/validation';
import { userUpdateSchema } from '@/utils/validation';
import { authenticateToken, requireRole } from '@/middleware/auth';
import { DatabaseError } from '@/utils/database';
import { prisma } from '@/lib/database';
import { calculateTrustScore } from '@/utils/database';

const router = Router();

/**
 * GET /api/users/profile
 * Get current user profile
 */
router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    const user = await AuthService.getUserProfile(req.user!.id);
    
    res.json({
      message: 'Profile retrieved successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Get profile error:', error);
    
    if (error instanceof DatabaseError) {
      res.status(404).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'PROFILE_FETCH_FAILED',
          message: 'Failed to retrieve profile',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

/**
 * PUT /api/users/profile
 * Update current user profile
 */
router.put('/profile', authenticateToken, validateRequest(userUpdateSchema), async (req: Request, res: Response) => {
  try {
    const user = await AuthService.updateUserProfile(req.user!.id, req.body);
    
    res.json({
      message: 'Profile updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error instanceof DatabaseError) {
      res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'PROFILE_UPDATE_FAILED',
          message: 'Failed to update profile',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

/**
 * GET /api/users/:userId/trust-score
 * Get user trust score and reviews
 */
router.get('/:userId/trust-score', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    // Get user basic info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        trustScore: true,
        kycStatus: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Get reviews
    const reviews = await prisma.review.findMany({
      where: {
        rateeId: userId,
        isActive: true,
      },
      include: {
        rater: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Latest 10 reviews
    });
    
    // Calculate current trust score
    const currentTrustScore = await calculateTrustScore(userId);
    
    // Update trust score if it's different
    if (currentTrustScore !== user.trustScore) {
      await prisma.user.update({
        where: { id: userId },
        data: { trustScore: currentTrustScore },
      });
    }
    
    // Calculate review statistics
    const reviewStats = {
      totalReviews: reviews.length,
      averageRating: currentTrustScore,
      ratingDistribution: {
        5: reviews.filter(r => r.rating === 5).length,
        4: reviews.filter(r => r.rating === 4).length,
        3: reviews.filter(r => r.rating === 3).length,
        2: reviews.filter(r => r.rating === 2).length,
        1: reviews.filter(r => r.rating === 1).length,
      },
    };
    
    res.json({
      message: 'Trust score retrieved successfully',
      data: {
        user: {
          ...user,
          trustScore: currentTrustScore,
        },
        reviews,
        reviewStats,
      },
    });
  } catch (error) {
    console.error('Get trust score error:', error);
    
    res.status(500).json({
      error: {
        code: 'TRUST_SCORE_FETCH_FAILED',
        message: 'Failed to retrieve trust score',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/users/kyc-verification
 * Submit KYC verification documents
 */
router.post('/kyc-verification', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        error: {
          code: 'MISSING_DOCUMENTS',
          message: 'KYC documents are required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // In a real implementation, you would process and validate the documents
    // For now, we'll just update the KYC status to pending
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        kycStatus: 'PENDING',
        updatedAt: new Date(),
      },
    });
    
    // Remove password hash from response
    const { passwordHash: _, ...userWithoutPassword } = user;
    
    res.json({
      message: 'KYC documents submitted successfully. Verification is in progress.',
      data: { user: userWithoutPassword },
    });
  } catch (error) {
    console.error('KYC submission error:', error);
    
    res.status(500).json({
      error: {
        code: 'KYC_SUBMISSION_FAILED',
        message: 'Failed to submit KYC documents',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/users/:userId/public-profile
 * Get public user profile (for listing pages, etc.)
 */
router.get('/:userId/public-profile', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        company: true,
        city: true,
        state: true,
        trustScore: true,
        kycStatus: true,
        phoneVerified: true,
        emailVerified: true,
        createdAt: true,
      },
    });
    
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    // Get review count and average rating
    const reviewCount = await prisma.review.count({
      where: {
        rateeId: userId,
        isActive: true,
      },
    });
    
    // Get listing count
    const listingCount = await prisma.listing.count({
      where: {
        sellerId: userId,
        status: 'LIVE',
        isActive: true,
      },
    });
    
    res.json({
      message: 'Public profile retrieved successfully',
      data: {
        user,
        stats: {
          reviewCount,
          listingCount,
        },
      },
    });
  } catch (error) {
    console.error('Get public profile error:', error);
    
    res.status(500).json({
      error: {
        code: 'PUBLIC_PROFILE_FETCH_FAILED',
        message: 'Failed to retrieve public profile',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * Admin routes
 */

/**
 * GET /api/users
 * Get all users (Admin only)
 */
router.get('/', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, search, role, kycStatus } = req.query;
    
    const where: any = {};
    
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { company: { contains: search as string, mode: 'insensitive' } },
      ];
    }
    
    if (role) {
      where.role = role;
    }
    
    if (kycStatus) {
      where.kycStatus = kycStatus;
    }
    
    const skip = (Number(page) - 1) * Number(limit);
    
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          phone: true,
          firstName: true,
          lastName: true,
          company: true,
          role: true,
          kycStatus: true,
          phoneVerified: true,
          emailVerified: true,
          city: true,
          state: true,
          trustScore: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.user.count({ where }),
    ]);
    
    const totalPages = Math.ceil(total / Number(limit));
    
    res.json({
      message: 'Users retrieved successfully',
      data: {
        users,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          totalPages,
          hasNext: Number(page) < totalPages,
          hasPrev: Number(page) > 1,
        },
      },
    });
  } catch (error) {
    console.error('Get users error:', error);
    
    res.status(500).json({
      error: {
        code: 'USERS_FETCH_FAILED',
        message: 'Failed to retrieve users',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * PUT /api/users/:userId/kyc-status
 * Update user KYC status (Admin only)
 */
router.put('/:userId/kyc-status', authenticateToken, requireRole('ADMIN'), async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { kycStatus, reason } = req.body;
    
    if (!['PENDING', 'VERIFIED', 'REJECTED'].includes(kycStatus)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_KYC_STATUS',
          message: 'Invalid KYC status',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
      },
    });
    
    // Create notification for user
    await prisma.notification.create({
      data: {
        userId,
        type: kycStatus === 'VERIFIED' ? 'LISTING_APPROVED' : 'LISTING_REJECTED',
        title: `KYC ${kycStatus}`,
        message: kycStatus === 'VERIFIED' 
          ? 'Your KYC verification has been approved'
          : `Your KYC verification was rejected${reason ? `: ${reason}` : ''}`,
        data: { reason },
      },
    });
    
    res.json({
      message: 'KYC status updated successfully',
      data: { user },
    });
  } catch (error) {
    console.error('Update KYC status error:', error);
    
    res.status(500).json({
      error: {
        code: 'KYC_STATUS_UPDATE_FAILED',
        message: 'Failed to update KYC status',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;