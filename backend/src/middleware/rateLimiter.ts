import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

export interface RateLimitOptions {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Maximum requests per window
  keyGenerator?: (req: Request) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  message?: string;
  statusCode?: number;
  headers?: boolean;
}

/**
 * Redis-based rate limiter middleware
 */
export function rateLimiter(options: RateLimitOptions) {
  const {
    windowMs,
    maxRequests,
    keyGenerator = (req) => req.ip,
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    headers = true
  } = options;

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const key = `rate_limit:${keyGenerator(req)}`;
      const window = Math.floor(Date.now() / windowMs);
      const windowKey = `${key}:${window}`;

      // Get current request count for this window
      const current = await redis.get(windowKey);
      const requestCount = current ? parseInt(current) : 0;

      // Set rate limit headers
      if (headers) {
        res.set({
          'X-RateLimit-Limit': maxRequests.toString(),
          'X-RateLimit-Remaining': Math.max(0, maxRequests - requestCount - 1).toString(),
          'X-RateLimit-Reset': ((window + 1) * windowMs).toString()
        });
      }

      // Check if limit exceeded
      if (requestCount >= maxRequests) {
        res.set('Retry-After', Math.ceil(windowMs / 1000).toString());
        return res.status(statusCode).json({
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message,
            retryAfter: Math.ceil(windowMs / 1000)
          }
        });
      }

      // Increment counter
      await redis.multi()
        .incr(windowKey)
        .expire(windowKey, Math.ceil(windowMs / 1000))
        .exec();

      // Continue to next middleware
      next();
    } catch (error) {
      console.error('Rate limiter error:', error);
      // Continue on error to avoid blocking requests
      next();
    }
  };
}

/**
 * Predefined rate limit configurations
 */
export const rateLimitConfigs = {
  // Strict limits for authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5, // 5 attempts per 15 minutes
    keyGenerator: (req: Request) => `auth:${req.ip}:${req.body.email || req.body.phone || 'unknown'}`,
    message: 'Too many authentication attempts, please try again in 15 minutes.'
  },

  // General API limits
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // 100 requests per 15 minutes
    keyGenerator: (req: Request) => `api:${req.ip}`
  },

  // Search endpoint limits
  search: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 30, // 30 searches per minute
    keyGenerator: (req: Request) => `search:${req.ip}`
  },

  // Upload endpoint limits
  upload: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 uploads per minute
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || req.ip;
      return `upload:${userId}`;
    }
  },

  // Message sending limits
  messaging: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 20, // 20 messages per minute
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || req.ip;
      return `message:${userId}`;
    }
  },

  // Admin endpoints
  admin: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyGenerator: (req: Request) => {
      const userId = (req as any).user?.id || req.ip;
      return `admin:${userId}`;
    }
  }
};

/**
 * Dynamic rate limiter based on user type
 */
export function dynamicRateLimiter(
  baseOptions: RateLimitOptions,
  userMultipliers: { [role: string]: number } = {}
) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    const userRole = user?.role || 'anonymous';
    const multiplier = userMultipliers[userRole] || 1;

    const options = {
      ...baseOptions,
      maxRequests: Math.floor(baseOptions.maxRequests * multiplier)
    };

    return rateLimiter(options)(req, res, next);
  };
}