import { prisma } from '@/lib/database';
import { NotificationType } from '@prisma/client';
import { getSocketService } from './socketService';

export interface CreateNotificationData {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
}

export class NotificationService {
  /**
   * Create a new notification
   */
  async createNotification(data: CreateNotificationData) {
    const notification = await prisma.notification.create({
      data: {
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        data: data.data || {},
      },
    });

    // Send real-time notification
    try {
      const socketService = getSocketService();
      socketService.sendNotificationToUser(data.userId, notification);
    } catch (error) {
      console.error('Failed to send real-time notification:', error);
    }

    return notification;
  }

  /**
   * Create message notification
   */
  async createMessageNotification(receiverId: string, senderName: string, listingTitle: string, messageContent: string) {
    return this.createNotification({
      userId: receiverId,
      type: NotificationType.MESSAGE,
      title: 'New Message',
      message: `${senderName} sent you a message about "${listingTitle}": ${messageContent.substring(0, 100)}${messageContent.length > 100 ? '...' : ''}`,
      data: {
        senderName,
        listingTitle,
        messageContent,
      },
    });
  }

  /**
   * Create quote notification
   */
  async createQuoteNotification(receiverId: string, senderName: string, listingTitle: string, quoteAmount: number, quoteStatus: string) {
    let title = 'Quote Update';
    let message = '';

    switch (quoteStatus) {
      case 'PENDING':
        title = 'New Quote Received';
        message = `${senderName} sent you a quote of $${quoteAmount} for "${listingTitle}"`;
        break;
      case 'ACCEPTED':
        title = 'Quote Accepted';
        message = `Your quote of $${quoteAmount} for "${listingTitle}" was accepted`;
        break;
      case 'REJECTED':
        title = 'Quote Rejected';
        message = `Your quote of $${quoteAmount} for "${listingTitle}" was rejected`;
        break;
      case 'COUNTERED':
        title = 'Quote Countered';
        message = `${senderName} countered your quote with $${quoteAmount} for "${listingTitle}"`;
        break;
    }

    return this.createNotification({
      userId: receiverId,
      type: NotificationType.QUOTE,
      title,
      message,
      data: {
        senderName,
        listingTitle,
        quoteAmount,
        quoteStatus,
      },
    });
  }

  /**
   * Get user notifications
   */
  async getUserNotifications(userId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const totalCount = await prisma.notification.count({
      where: { userId }
    });

    return {
      notifications,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      }
    };
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  /**
   * Mark all notifications as read for user
   */
  async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        isRead: false,
      }
    });
  }

  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string) {
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId,
      }
    });

    if (!notification) {
      throw new Error('Notification not found');
    }

    return prisma.notification.delete({
      where: { id: notificationId },
    });
  }
}

export const notificationService = new NotificationService();