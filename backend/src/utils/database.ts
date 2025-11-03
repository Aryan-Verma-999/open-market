import { prisma } from '@/lib/database';
import { Prisma } from '@prisma/client';

/**
 * Database utility functions for common operations
 */

export class DatabaseError extends Error {
  constructor(message: string, public code?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

/**
 * Handle Prisma errors and convert them to user-friendly messages
 */
export function handlePrismaError(error: any): DatabaseError {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return new DatabaseError('A record with this information already exists', 'DUPLICATE_ENTRY');
      case 'P2025':
        return new DatabaseError('Record not found', 'NOT_FOUND');
      case 'P2003':
        return new DatabaseError('Invalid reference to related record', 'FOREIGN_KEY_CONSTRAINT');
      case 'P2014':
        return new DatabaseError('Invalid ID provided', 'INVALID_ID');
      default:
        return new DatabaseError('Database operation failed', 'DATABASE_ERROR');
    }
  }
  
  if (error instanceof Prisma.PrismaClientValidationError) {
    return new DatabaseError('Invalid data provided', 'VALIDATION_ERROR');
  }
  
  return new DatabaseError('An unexpected database error occurred', 'UNKNOWN_ERROR');
}

/**
 * Execute a database operation with error handling
 */
export async function executeWithErrorHandling<T>(
  operation: () => Promise<T>
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw handlePrismaError(error);
  }
}

/**
 * Check if a record exists by ID
 */
export async function recordExists(
  model: keyof typeof prisma,
  id: string
): Promise<boolean> {
  try {
    const record = await (prisma[model] as any).findUnique({
      where: { id },
      select: { id: true },
    });
    return !!record;
  } catch {
    return false;
  }
}

/**
 * Get paginated results with metadata
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  orderBy?: Record<string, 'asc' | 'desc'>;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export async function getPaginatedResults<T>(
  model: any,
  options: PaginationOptions & { where?: any; include?: any; select?: any } = {}
): Promise<PaginatedResult<T>> {
  const {
    page = 1,
    limit = 10,
    orderBy = { createdAt: 'desc' },
    where = {},
    include,
    select,
  } = options;

  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    model.findMany({
      where,
      include,
      select,
      orderBy,
      skip,
      take: limit,
    }),
    model.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    },
  };
}

/**
 * Generate a unique conversation ID for messaging
 */
export function generateConversationId(userId1: string, userId2: string, listingId: string): string {
  const sortedUsers = [userId1, userId2].sort();
  return `${sortedUsers[0]}_${sortedUsers[1]}_${listingId}`;
}

/**
 * Calculate trust score based on reviews
 */
export async function calculateTrustScore(userId: string): Promise<number> {
  const reviews = await prisma.review.findMany({
    where: {
      rateeId: userId,
      isActive: true,
    },
    select: {
      rating: true,
    },
  });

  if (reviews.length === 0) {
    return 0;
  }

  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  return Math.round((totalRating / reviews.length) * 10) / 10; // Round to 1 decimal place
}

/**
 * Update listing view count
 */
export async function incrementListingViews(listingId: string): Promise<void> {
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      views: {
        increment: 1,
      },
    },
  });
}

/**
 * Update listing save count
 */
export async function updateListingSaveCount(listingId: string): Promise<void> {
  const saveCount = await prisma.savedListing.count({
    where: { listingId },
  });

  await prisma.listing.update({
    where: { id: listingId },
    data: { saves: saveCount },
  });
}