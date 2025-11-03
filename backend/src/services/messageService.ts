import { prisma } from '@/lib/database';
import { MessageType, QuoteStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import { getSocketService } from './socketService';
import { notificationService } from './notificationService';

export interface CreateMessageData {
  senderId: string;
  receiverId: string;
  listingId: string;
  content: string;
  attachments?: string[];
  messageType?: MessageType;
  quoteAmount?: number;
  quoteTerms?: string;
}

export interface UpdateQuoteData {
  quoteStatus: QuoteStatus;
  quoteAmount?: number;
  quoteTerms?: string;
}

export class MessageService {
  /**
   * Generate conversation ID based on listing and participants
   */
  private generateConversationId(listingId: string, userId1: string, userId2: string): string {
    // Sort user IDs to ensure consistent conversation ID regardless of who initiates
    const sortedUsers = [userId1, userId2].sort();
    return `${listingId}_${sortedUsers[0]}_${sortedUsers[1]}`;
  }

  /**
   * Create a new message
   */
  async createMessage(data: CreateMessageData) {
    const conversationId = this.generateConversationId(
      data.listingId,
      data.senderId,
      data.receiverId
    );

    // Verify listing exists and get seller info
    const listing = await prisma.listing.findUnique({
      where: { id: data.listingId },
      include: { seller: true }
    });

    if (!listing) {
      throw new Error('Listing not found');
    }

    // Verify receiver is either the seller or a valid user
    if (data.receiverId !== listing.sellerId) {
      const receiver = await prisma.user.findUnique({
        where: { id: data.receiverId }
      });
      if (!receiver) {
        throw new Error('Receiver not found');
      }
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId: data.senderId,
        receiverId: data.receiverId,
        listingId: data.listingId,
        content: data.content,
        attachments: data.attachments || [],
        messageType: data.messageType || MessageType.TEXT,
        quoteAmount: data.quoteAmount,
        quoteTerms: data.quoteTerms,
        quoteStatus: data.messageType === MessageType.QUOTE ? QuoteStatus.PENDING : null,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            trustScore: true,
            kycStatus: true,
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          }
        }
      }
    });

    // Send real-time notification
    try {
      const socketService = getSocketService();
      socketService.notifyNewMessage(message, conversationId);
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      // Don't fail the message creation if WebSocket fails
    }

    // Create notification for receiver
    try {
      if (data.messageType === MessageType.QUOTE && data.quoteAmount) {
        await notificationService.createQuoteNotification(
          data.receiverId,
          `${message.sender.firstName} ${message.sender.lastName}`,
          message.listing.title,
          data.quoteAmount,
          'PENDING'
        );
      } else {
        await notificationService.createMessageNotification(
          data.receiverId,
          `${message.sender.firstName} ${message.sender.lastName}`,
          message.listing.title,
          data.content
        );
      }
    } catch (error) {
      console.error('Failed to create notification:', error);
    }

    return message;
  }

  /**
   * Get conversation messages between two users for a specific listing
   */
  async getConversation(listingId: string, userId1: string, userId2: string, page = 1, limit = 50) {
    const conversationId = this.generateConversationId(listingId, userId1, userId2);
    const offset = (page - 1) * limit;

    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustScore: true,
            kycStatus: true,
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const totalCount = await prisma.message.count({
      where: { conversationId }
    });

    return {
      messages: messages.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    };
  }

  /**
   * Get all conversations for a user
   */
  async getUserConversations(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    // Get latest message for each conversation
    const conversations = await prisma.$queryRaw`
      SELECT DISTINCT ON (m.conversation_id)
        m.conversation_id,
        m.id as last_message_id,
        m.content as last_message_content,
        m.message_type as last_message_type,
        m.created_at as last_message_at,
        m.sender_id,
        m.receiver_id,
        m.listing_id,
        CASE 
          WHEN m.sender_id = ${userId} THEN m.receiver_id 
          ELSE m.sender_id 
        END as other_user_id,
        COUNT(*) FILTER (WHERE m.receiver_id = ${userId} AND m.read_at IS NULL) as unread_count
      FROM messages m
      WHERE m.sender_id = ${userId} OR m.receiver_id = ${userId}
      GROUP BY m.conversation_id, m.id, m.content, m.message_type, m.created_at, 
               m.sender_id, m.receiver_id, m.listing_id
      ORDER BY m.conversation_id, m.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    ` as any[];

    // Get additional details for each conversation
    const enrichedConversations = await Promise.all(
      conversations.map(async (conv) => {
        const [otherUser, listing] = await Promise.all([
          prisma.user.findUnique({
            where: { id: conv.other_user_id },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              trustScore: true,
              kycStatus: true,
            }
          }),
          prisma.listing.findUnique({
            where: { id: conv.listing_id },
            select: {
              id: true,
              title: true,
              price: true,
              images: true,
              status: true,
            }
          })
        ]);

        return {
          conversationId: conv.conversation_id,
          lastMessage: {
            id: conv.last_message_id,
            content: conv.last_message_content,
            messageType: conv.last_message_type,
            createdAt: conv.last_message_at,
            senderId: conv.sender_id,
          },
          otherUser,
          listing,
          unreadCount: parseInt(conv.unread_count) || 0,
        };
      })
    );

    return {
      conversations: enrichedConversations,
      pagination: {
        page,
        limit,
        hasMore: conversations.length === limit,
      }
    };
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(conversationId: string, userId: string) {
    await prisma.message.updateMany({
      where: {
        conversationId,
        receiverId: userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      }
    });
  }

  /**
   * Update quote status (accept, reject, counter)
   */
  async updateQuoteStatus(messageId: string, userId: string, data: UpdateQuoteData) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: { listing: true }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.messageType !== MessageType.QUOTE) {
      throw new Error('Message is not a quote');
    }

    // Only receiver can update quote status, or sender can counter
    if (data.quoteStatus === QuoteStatus.COUNTERED && message.senderId !== userId) {
      throw new Error('Only quote sender can counter');
    } else if (data.quoteStatus !== QuoteStatus.COUNTERED && message.receiverId !== userId) {
      throw new Error('Only quote receiver can accept/reject');
    }

    const updatedMessage = await prisma.message.update({
      where: { id: messageId },
      data: {
        quoteStatus: data.quoteStatus,
        quoteAmount: data.quoteAmount,
        quoteTerms: data.quoteTerms,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
          }
        }
      }
    });

    // Send real-time notification for quote status update
    try {
      const socketService = getSocketService();
      socketService.notifyQuoteStatusUpdate(updatedMessage, message.conversationId);
    } catch (error) {
      console.error('Failed to send WebSocket notification:', error);
      // Don't fail the update if WebSocket fails
    }

    // Create notification for quote status update
    try {
      const receiverId = data.quoteStatus === QuoteStatus.COUNTERED ? message.receiverId : message.senderId;
      await notificationService.createQuoteNotification(
        receiverId,
        `${updatedMessage.receiver.firstName} ${updatedMessage.receiver.lastName}`,
        updatedMessage.listing.title,
        updatedMessage.quoteAmount?.toNumber() || 0,
        data.quoteStatus
      );
    } catch (error) {
      console.error('Failed to create quote notification:', error);
    }

    return updatedMessage;
  }

  /**
   * Get message by ID with full details
   */
  async getMessageById(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustScore: true,
            kycStatus: true,
          }
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        },
        listing: {
          select: {
            id: true,
            title: true,
            price: true,
            images: true,
          }
        }
      }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    // Verify user is part of this conversation
    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new Error('Access denied');
    }

    return message;
  }

  /**
   * Delete a message (soft delete by setting content to deleted)
   */
  async deleteMessage(messageId: string, userId: string) {
    const message = await prisma.message.findUnique({
      where: { id: messageId }
    });

    if (!message) {
      throw new Error('Message not found');
    }

    if (message.senderId !== userId) {
      throw new Error('Only sender can delete message');
    }

    await prisma.message.update({
      where: { id: messageId },
      data: {
        content: '[Message deleted]',
        attachments: [],
      }
    });
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    const count = await prisma.message.count({
      where: {
        receiverId: userId,
        readAt: null,
      }
    });

    return count;
  }
}

export const messageService = new MessageService();