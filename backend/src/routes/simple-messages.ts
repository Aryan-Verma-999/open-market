import { Router, Request, Response } from 'express';
import { prisma } from '../lib/database';
import { authenticateToken } from './simple-auth';

const router = Router();

// Get user's messages/conversations
router.get('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;

    // Get conversations where user is either sender or receiver
    const conversations = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId }
        ]
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
            images: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    });

    // Group messages by conversation (listing + other user)
    const conversationMap = new Map();
    
    conversations.forEach(message => {
      const otherUser = message.senderId === userId ? message.receiver : message.sender;
      const key = `${message.listingId}-${otherUser.id}`;
      
      if (!conversationMap.has(key)) {
        conversationMap.set(key, {
          id: key,
          listingId: message.listingId,
          listing: message.listing,
          otherUser,
          lastMessage: message,
          messages: []
        });
      }
      
      conversationMap.get(key).messages.push(message);
    });

    const conversationList = Array.from(conversationMap.values());

    res.json({
      conversations: conversationList,
      total: conversationList.length
    });

  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Get messages for a specific conversation
router.get('/conversation/:listingId/:otherUserId', authenticateToken, async (req: any, res: Response) => {
  try {
    const userId = req.user.userId;
    const { listingId, otherUserId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        listingId,
        OR: [
          { senderId: userId, receiverId: otherUserId },
          { senderId: otherUserId, receiverId: userId }
        ]
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
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    res.json({
      messages,
      total: messages.length
    });

  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Send a message
router.post('/', authenticateToken, async (req: any, res: Response) => {
  try {
    const senderId = req.user.userId;
    const { receiverId, listingId, message, messageType = 'TEXT' } = req.body;

    if (!receiverId || !listingId || !message) {
      return res.status(400).json({
        error: 'Receiver ID, listing ID, and message are required'
      });
    }

    // Verify listing exists
    const listing = await prisma.listing.findUnique({
      where: { id: listingId }
    });

    if (!listing) {
      return res.status(404).json({
        error: 'Listing not found'
      });
    }

    // Create message
    const newMessage = await prisma.message.create({
      data: {
        senderId,
        receiverId,
        listingId,
        content: message,
        messageType,
        conversationId: `${listingId}-${[senderId, receiverId].sort().join('-')}`
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
            price: true
          }
        }
      }
    });

    res.json({
      success: true,
      message: newMessage
    });

  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

export default router;