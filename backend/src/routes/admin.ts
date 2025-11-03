import { Router, Request, Response } from 'express';
import { authenticateToken, requireRole } from '@/middleware/auth';
import { adminService } from '@/services/adminService';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// Apply admin authentication to all routes
router.use(authenticateToken);
router.use(requireRole('ADMIN'));

/**
 * Get moderation dashboard statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await adminService.getModerationStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    res.status(500).json({
      error: {
        code: 'STATS_FETCH_ERROR',
        message: 'Failed to fetch moderation statistics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get pending listings for moderation
 */
router.get('/listings/pending', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString()
        }
      });
    }

    const page = req.query.page as number | undefined || 1;
    const limit = req.query.limit as number | undefined || 20;

    const result = await adminService.getPendingListings(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching pending listings:', error);
    res.status(500).json({
      error: {
        code: 'PENDING_LISTINGS_ERROR',
        message: 'Failed to fetch pending listings',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Moderate a listing (approve/reject)
 */
router.post('/listings/:listingId/moderate', [
  param('listingId').isString().notEmpty(),
  body('action').isIn(['APPROVE', 'REJECT']),
  body('reason').optional().isString().isLength({ max: 500 }),
  body('adminNotes').optional().isString().isLength({ max: 1000 })
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

    const { listingId } = req.params;
    const { action, reason, adminNotes } = req.body;
    const adminId = req.user!.id;

    const result = await adminService.moderateListing({
      listingId,
      action,
      reason,
      adminNotes
    }, adminId);
    
    res.json({
      success: true,
      data: result,
      message: `Listing ${action.toLowerCase()}d successfully`
    });
  } catch (error) {
    console.error('Error moderating listing:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = error instanceof Error && error.message.includes('not found') 
      ? 'LISTING_NOT_FOUND' 
      : 'MODERATION_ERROR';
    
    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to moderate listing',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Bulk approve listings
 */
router.post('/listings/bulk-approve', [
  body('listingIds').isArray({ min: 1, max: 50 }),
  body('listingIds.*').isString().notEmpty()
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

    const { listingIds } = req.body;
    const adminId = req.user!.id;

    const results = await adminService.bulkApproveListing(listingIds, adminId);
    
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    
    res.json({
      success: true,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failureCount
        }
      },
      message: `Bulk approval completed: ${successCount} successful, ${failureCount} failed`
    });
  } catch (error) {
    console.error('Error in bulk approval:', error);
    res.status(500).json({
      error: {
        code: 'BULK_APPROVAL_ERROR',
        message: 'Failed to perform bulk approval',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get flagged content and reports
 */
router.get('/reports', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString()
        }
      });
    }

    const page = req.query.page as number | undefined || 1;
    const limit = req.query.limit as number | undefined || 20;

    const result = await adminService.getFlaggedContent(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      error: {
        code: 'REPORTS_FETCH_ERROR',
        message: 'Failed to fetch reports',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Handle report (resolve/dismiss)
 */
router.post('/reports/:reportId/handle', [
  param('reportId').isString().notEmpty(),
  body('action').isIn(['RESOLVE', 'DISMISS']),
  body('adminNotes').optional().isString().isLength({ max: 1000 })
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

    const { reportId } = req.params;
    const { action, adminNotes } = req.body;
    const adminId = req.user!.id;

    const result = await adminService.handleReport({
      reportId,
      action,
      adminNotes
    }, adminId);
    
    res.json({
      success: true,
      data: result,
      message: `Report ${action.toLowerCase()}d successfully`
    });
  } catch (error) {
    console.error('Error handling report:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = error instanceof Error && error.message.includes('not found') 
      ? 'REPORT_NOT_FOUND' 
      : 'REPORT_HANDLING_ERROR';
    
    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to handle report',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get users pending verification
 */
router.get('/users/verification', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString()
        }
      });
    }

    const page = req.query.page as number | undefined || 1;
    const limit = req.query.limit as number | undefined || 20;

    const result = await adminService.getUsersForVerification(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching users for verification:', error);
    res.status(500).json({
      error: {
        code: 'VERIFICATION_FETCH_ERROR',
        message: 'Failed to fetch users for verification',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Update user verification status
 */
router.post('/users/:userId/verify', [
  param('userId').isString().notEmpty(),
  body('kycStatus').isIn(['VERIFIED', 'REJECTED']),
  body('reason').optional().isString().isLength({ max: 500 }),
  body('trustBadge').optional().isBoolean()
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

    const { userId } = req.params;
    const { kycStatus, reason, trustBadge } = req.body;
    const adminId = req.user!.id;

    const result = await adminService.updateUserVerification({
      userId,
      kycStatus,
      reason,
      trustBadge
    }, adminId);
    
    res.json({
      success: true,
      data: result,
      message: `User verification ${kycStatus.toLowerCase()} successfully`
    });
  } catch (error) {
    console.error('Error updating user verification:', error);
    
    const statusCode = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    const errorCode = error instanceof Error && error.message.includes('not found') 
      ? 'USER_NOT_FOUND' 
      : 'VERIFICATION_UPDATE_ERROR';
    
    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: error instanceof Error ? error.message : 'Failed to update user verification',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get automated content check results
 */
router.get('/listings/:listingId/content-check', [
  param('listingId').isString().notEmpty()
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

    const { listingId } = req.params;

    const result = await adminService.getAutomatedContentChecks(listingId);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching content check results:', error);
    res.status(500).json({
      error: {
        code: 'CONTENT_CHECK_ERROR',
        message: 'Failed to fetch content check results',
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * Get moderation activity logs
 */
router.get('/logs', [
  query('page').optional().isInt({ min: 1 }).toInt(),
  query('limit').optional().isInt({ min: 1, max: 100 }).toInt()
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: errors.array(),
          timestamp: new Date().toISOString()
        }
      });
    }

    const page = req.query.page as number | undefined || 1;
    const limit = req.query.limit as number | undefined || 50;

    const result = await adminService.getModerationLogs(page, limit);
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error fetching moderation logs:', error);
    res.status(500).json({
      error: {
        code: 'LOGS_FETCH_ERROR',
        message: 'Failed to fetch moderation logs',
        timestamp: new Date().toISOString()
      }
    });
  }
});

export default router;