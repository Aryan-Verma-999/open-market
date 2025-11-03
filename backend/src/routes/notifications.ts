import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { notificationService } from '@/services/notificationService';
import Joi from 'joi';

const router = Router();

// Validation schemas
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

/**
 * GET /api/notifications
 * Get user notifications
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = paginationSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const userId = req.user!.id;
    const result = await notificationService.getUserNotifications(
      userId,
      value.page,
      value.limit
    );

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({
      error: {
        code: 'NOTIFICATIONS_FETCH_FAILED',
        message: 'Failed to fetch notifications',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * PUT /api/notifications/:notificationId/read
 * Mark notification as read
 */
router.put('/:notificationId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    const notification = await notificationService.markAsRead(notificationId, userId);

    res.json({
      success: true,
      data: notification,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark notification read error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let errorCode = 'MARK_READ_FAILED';

    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOTIFICATION_NOT_FOUND';
    }

    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * PUT /api/notifications/read-all
 * Mark all notifications as read
 */
router.put('/read-all', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    await notificationService.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    res.status(500).json({
      error: {
        code: 'MARK_ALL_READ_FAILED',
        message: 'Failed to mark all notifications as read',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);

    res.json({
      success: true,
      data: { unreadCount: count },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      error: {
        code: 'UNREAD_COUNT_FAILED',
        message: 'Failed to get unread count',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * DELETE /api/notifications/:notificationId
 * Delete notification
 */
router.delete('/:notificationId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user!.id;

    await notificationService.deleteNotification(notificationId, userId);

    res.json({
      success: true,
      message: 'Notification deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete notification error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let errorCode = 'DELETE_FAILED';

    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOTIFICATION_NOT_FOUND';
    }

    res.status(statusCode).json({
      error: {
        code: errorCode,
        message: errorMessage,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;