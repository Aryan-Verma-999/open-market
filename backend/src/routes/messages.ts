import { Router, Request, Response } from 'express';
import { authenticateToken } from '@/middleware/auth';
import { messageService } from '@/services/messageService';
import { MessageType, QuoteStatus } from '@prisma/client';
import Joi from 'joi';

const router = Router();

// Validation schemas
const createMessageSchema = Joi.object({
  receiverId: Joi.string().required(),
  listingId: Joi.string().required(),
  content: Joi.string().min(1).max(2000).required(),
  attachments: Joi.array().items(Joi.string().uri()).max(5).optional(),
  messageType: Joi.string().valid(...Object.values(MessageType)).optional(),
  quoteAmount: Joi.number().positive().optional(),
  quoteTerms: Joi.string().max(500).optional(),
});

const updateQuoteSchema = Joi.object({
  quoteStatus: Joi.string().valid(...Object.values(QuoteStatus)).required(),
  quoteAmount: Joi.number().positive().optional(),
  quoteTerms: Joi.string().max(500).optional(),
});

const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(50),
});

/**
 * POST /api/messages
 * Create a new message
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { error, value } = createMessageSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: error.details[0].message,
          timestamp: new Date().toISOString(),
        },
      });
    }

    const senderId = req.user!.id;
    
    // Prevent sending message to self
    if (senderId === value.receiverId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_RECEIVER',
          message: 'Cannot send message to yourself',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const message = await messageService.createMessage({
      senderId,
      ...value,
    });

    res.status(201).json({
      success: true,
      data: message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Create message error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let errorCode = 'MESSAGE_CREATION_FAILED';

    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorCode = 'RESOURCE_NOT_FOUND';
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
 * GET /api/messages/unread-count
 * Get unread message count for user
 */
router.get('/unread-count', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const count = await messageService.getUnreadCount(userId);

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
 * GET /api/messages/conversations
 * Get all conversations for the authenticated user
 */
router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
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
    const result = await messageService.getUserConversations(
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
    console.error('Get conversations error:', error);
    res.status(500).json({
      error: {
        code: 'CONVERSATIONS_FETCH_FAILED',
        message: 'Failed to fetch conversations',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * GET /api/messages/conversations/:listingId/:otherUserId
 * Get conversation messages between current user and another user for a specific listing
 */
router.get('/conversations/:listingId/:otherUserId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { listingId, otherUserId } = req.params;
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
    
    if (userId === otherUserId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_CONVERSATION',
          message: 'Cannot have conversation with yourself',
          timestamp: new Date().toISOString(),
        },
      });
    }

    const result = await messageService.getConversation(
      listingId,
      userId,
      otherUserId,
      value.page,
      value.limit
    );

    // Mark messages as read
    const conversationId = `${listingId}_${[userId, otherUserId].sort().join('_')}`;
    await messageService.markMessagesAsRead(conversationId, userId);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: {
        code: 'CONVERSATION_FETCH_FAILED',
        message: 'Failed to fetch conversation',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * PUT /api/messages/:messageId/quote-status
 * Update quote status (accept, reject, counter)
 */
router.put('/:messageId/quote-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const { error, value } = updateQuoteSchema.validate(req.body);
    
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
    const updatedMessage = await messageService.updateQuoteStatus(messageId, userId, value);

    res.json({
      success: true,
      data: updatedMessage,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Update quote status error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let errorCode = 'QUOTE_UPDATE_FAILED';

    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorCode = 'MESSAGE_NOT_FOUND';
    } else if (errorMessage.includes('Access denied') || errorMessage.includes('Only')) {
      statusCode = 403;
      errorCode = 'ACCESS_DENIED';
    } else if (errorMessage.includes('not a quote')) {
      statusCode = 400;
      errorCode = 'INVALID_MESSAGE_TYPE';
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
 * GET /api/messages/:messageId
 * Get message by ID
 */
router.get('/:messageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    const message = await messageService.getMessageById(messageId, userId);

    res.json({
      success: true,
      data: message,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Get message error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let errorCode = 'MESSAGE_FETCH_FAILED';

    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorCode = 'MESSAGE_NOT_FOUND';
    } else if (errorMessage.includes('Access denied')) {
      statusCode = 403;
      errorCode = 'ACCESS_DENIED';
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
 * DELETE /api/messages/:messageId
 * Delete a message (soft delete)
 */
router.delete('/:messageId', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const userId = req.user!.id;

    await messageService.deleteMessage(messageId, userId);

    res.json({
      success: true,
      message: 'Message deleted successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Delete message error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    let statusCode = 500;
    let errorCode = 'MESSAGE_DELETE_FAILED';

    if (errorMessage.includes('not found')) {
      statusCode = 404;
      errorCode = 'MESSAGE_NOT_FOUND';
    } else if (errorMessage.includes('Only sender')) {
      statusCode = 403;
      errorCode = 'ACCESS_DENIED';
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
 * PUT /api/messages/conversations/:conversationId/read
 * Mark all messages in conversation as read
 */
router.put('/conversations/:conversationId/read', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user!.id;

    await messageService.markMessagesAsRead(conversationId, userId);

    res.json({
      success: true,
      message: 'Messages marked as read',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Mark messages read error:', error);
    res.status(500).json({
      error: {
        code: 'MARK_READ_FAILED',
        message: 'Failed to mark messages as read',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

export default router;