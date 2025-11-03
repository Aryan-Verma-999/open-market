import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { verifyAccessToken } from '@/utils/auth';
import { prisma } from '@/lib/database';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export class SocketService {
  private io: SocketIOServer;
  private connectedUsers: Map<string, string> = new Map(); // userId -> socketId

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    // Authentication middleware
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const payload = verifyAccessToken(token);
        const user = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            isActive: true,
          },
        });

        if (!user || !user.isActive) {
          return next(new Error('Invalid user or account deactivated'));
        }

        socket.userId = user.id;
        socket.user = user;
        next();
      } catch (error) {
        console.error('Socket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log(`User ${socket.user?.firstName} connected: ${socket.id}`);
      
      // Store user connection
      if (socket.userId) {
        this.connectedUsers.set(socket.userId, socket.id);
        
        // Join user to their personal room for notifications
        socket.join(`user:${socket.userId}`);
      }

      // Handle joining conversation rooms
      socket.on('join-conversation', (conversationId: string) => {
        socket.join(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} joined conversation: ${conversationId}`);
      });

      // Handle leaving conversation rooms
      socket.on('leave-conversation', (conversationId: string) => {
        socket.leave(`conversation:${conversationId}`);
        console.log(`User ${socket.userId} left conversation: ${conversationId}`);
      });

      // Handle typing indicators
      socket.on('typing-start', (data: { conversationId: string; receiverId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user-typing', {
          userId: socket.userId,
          userName: `${socket.user?.firstName} ${socket.user?.lastName}`,
          conversationId: data.conversationId,
        });
      });

      socket.on('typing-stop', (data: { conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('user-stopped-typing', {
          userId: socket.userId,
          conversationId: data.conversationId,
        });
      });

      // Handle message read receipts
      socket.on('message-read', (data: { messageId: string; conversationId: string }) => {
        socket.to(`conversation:${data.conversationId}`).emit('message-read-receipt', {
          messageId: data.messageId,
          readBy: socket.userId,
          readAt: new Date().toISOString(),
        });
      });

      // Handle user presence
      socket.on('update-presence', (status: 'online' | 'away' | 'busy') => {
        // Broadcast presence to all conversations user is part of
        socket.broadcast.emit('user-presence-update', {
          userId: socket.userId,
          status,
          lastSeen: new Date().toISOString(),
        });
      });

      // Handle disconnection
      socket.on('disconnect', (reason) => {
        console.log(`User ${socket.user?.firstName} disconnected: ${reason}`);
        
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId);
          
          // Broadcast offline status
          socket.broadcast.emit('user-presence-update', {
            userId: socket.userId,
            status: 'offline',
            lastSeen: new Date().toISOString(),
          });
        }
      });

      // Handle errors
      socket.on('error', (error) => {
        console.error('Socket error:', error);
      });
    });
  }

  /**
   * Send a new message notification to conversation participants
   */
  public notifyNewMessage(message: any, conversationId: string) {
    this.io.to(`conversation:${conversationId}`).emit('new-message', {
      message,
      conversationId,
      timestamp: new Date().toISOString(),
    });

    // Also send to receiver's personal room if they're not in the conversation room
    this.io.to(`user:${message.receiverId}`).emit('message-notification', {
      messageId: message.id,
      senderId: message.senderId,
      senderName: `${message.sender.firstName} ${message.sender.lastName}`,
      listingTitle: message.listing.title,
      content: message.content,
      messageType: message.messageType,
      conversationId,
      timestamp: message.createdAt,
    });
  }

  /**
   * Send quote status update notification
   */
  public notifyQuoteStatusUpdate(message: any, conversationId: string) {
    this.io.to(`conversation:${conversationId}`).emit('quote-status-update', {
      messageId: message.id,
      quoteStatus: message.quoteStatus,
      quoteAmount: message.quoteAmount,
      quoteTerms: message.quoteTerms,
      updatedBy: message.receiverId, // The person who updated the status
      timestamp: new Date().toISOString(),
    });

    // Send notification to the other party
    const notificationReceiverId = message.senderId; // Original quote sender gets notified
    this.io.to(`user:${notificationReceiverId}`).emit('quote-notification', {
      messageId: message.id,
      listingTitle: message.listing.title,
      quoteStatus: message.quoteStatus,
      quoteAmount: message.quoteAmount,
      updatedBy: `${message.receiver.firstName} ${message.receiver.lastName}`,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send general notification to a user
   */
  public sendNotificationToUser(userId: string, notification: any) {
    this.io.to(`user:${userId}`).emit('notification', {
      ...notification,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Check if user is online
   */
  public isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get online users count
   */
  public getOnlineUsersCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Get connected users
   */
  public getConnectedUsers(): string[] {
    return Array.from(this.connectedUsers.keys());
  }

  /**
   * Broadcast system message to all connected users
   */
  public broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.io.emit('system-message', {
      message,
      type,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Send message to specific conversation
   */
  public sendToConversation(conversationId: string, event: string, data: any) {
    this.io.to(`conversation:${conversationId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}

let socketService: SocketService;

export const initializeSocketService = (server: HTTPServer): SocketService => {
  socketService = new SocketService(server);
  return socketService;
};

export const getSocketService = (): SocketService => {
  if (!socketService) {
    throw new Error('Socket service not initialized');
  }
  return socketService;
};