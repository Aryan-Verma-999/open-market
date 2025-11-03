import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { body, param, validationResult } from 'express-validator';
import { prisma } from '@/lib/database';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

/**
 * Create a new report
 */
router.post('/', [
  body('listingId').optional().isString().notEmpty(),
  body('userId').optional().isString().notEmpty(),
  body('reason').isIn(['SPAM', 'INAPPROPRIATE_CONTENT', 'FAKE_LISTING', 'FRAUD', 'OTHER']),
  body('description').optional().isString().isLength({ max: 1000 })
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: errors.array(),
          timestamp: new Date().toISOString()
        }
      });
    }

    const { listingId, userId, reason, description } = req.body;
    const reporterId = req.user!.id;

    // Validate that either listingId or userId is provided
    if (!listingId && !userId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Either listingId or userId must be provided',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if listing exists (if reporting a listing)
    if (listingId) {
      const listing = await prisma.listing.findUnique({
        where: { id: listingId }
      });

      if (!listing) {
        return res.status(404).json({
          error: {
            code: 'LISTING_NOT_FOUND',
            message: 'Listing not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Prevent users from reporting their own listings
      if (listing.sellerId === reporterId) {
        return res.status(400).json({
          error: {
            code: 'CANNOT_REPORT_OWN_LISTING',
            message: 'You cannot report your own listing',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Check if user exists (if reporting a user)
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId }
      });

      if (!user) {
        return res.status(404).json({
          error: {
            code: 'USER_NOT_FOUND',
            message: 'User not found',
            timestamp: new Date().toISOString()
          }
        });
      }

      // Prevent users from reporting themselves
      if (userId === reporterId) {
        return res.status(400).json({
          error: {
            code: 'CANNOT_REPORT_SELF',
            message: 'You cannot report yourself',
            timestamp: new Date().toISOString()
          }
        });
      }
    }

    // Check for duplicate reports
    const existingReport = await prisma.report.findFirst({
      where: {
        reporterId,
        listingId: listingId || null,
        userId: userId || null,
        status: {
          in: ['PENDING', 'REVIEWED']
        }
      }
    });

    if (existingReport) {
      return res.status(400).json({
        error: {
          code: 'DUPLICATE_REPORT',
          message: 'You have already reported this content',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create the report
    const report = await prisma.report.create({
      data: {
        reporterId,
        listingId: listingId || null,
        userId: userId || null,
        reason,
        description: description || null
      },
      include: {
        reporter: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            seller: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: report,
      message: 'Report submitted successfully'
    });
  } catch (error) {
    console.error('Error creating report:', error);
    res.status(500).json({
      error: {
        code: 'REPORT_CREATION_ERROR',
        message: 'Failed to create report',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get user's reports
 */
router.get('/my-reports', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const reports = await prisma.report.findMany({
      where: { reporterId: userId },
      include: {
        listing: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      error: {
        code: 'REPORTS_FETCH_ERROR',
        message: 'Failed to fetch reports',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;