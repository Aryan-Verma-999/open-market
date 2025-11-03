import { Request, Response, NextFunction } from 'express';
import { prisma } from '@/lib/database';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '@/utils/auth';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        firstName: string;
        lastName: string;
        kycStatus: string;
        phoneVerified: boolean;
        emailVerified: boolean;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT tokens
 */
export async function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Access token is required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Verify the token
    let payload: JWTPayload;
    try {
      payload = verifyAccessToken(token);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'TOKEN_VERIFICATION_FAILED';
      
      let statusCode = 401;
      let errorCode = 'INVALID_TOKEN';
      let message = 'Invalid access token';

      if (errorMessage === 'ACCESS_TOKEN_EXPIRED') {
        errorCode = 'TOKEN_EXPIRED';
        message = 'Access token has expired';
      }

      res.status(statusCode).json({
        error: {
          code: errorCode,
          message,
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        kycStatus: true,
        phoneVerified: true,
        emailVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User associated with token not found',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!user.isActive) {
      res.status(401).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'User account has been deactivated',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: 'An error occurred during authentication',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Middleware to check if user has required role(s)
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_REQUIRED',
          message: 'Authentication is required',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: 'You do not have permission to access this resource',
          timestamp: new Date().toISOString(),
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware to check if user is verified (KYC and phone)
 */
export function requireVerification(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Authentication is required',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (req.user.kycStatus !== 'VERIFIED') {
    res.status(403).json({
      error: {
        code: 'KYC_VERIFICATION_REQUIRED',
        message: 'KYC verification is required for this action',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (!req.user.phoneVerified) {
    res.status(403).json({
      error: {
        code: 'PHONE_VERIFICATION_REQUIRED',
        message: 'Phone verification is required for this action',
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  next();
}

/**
 * Optional authentication middleware - doesn't fail if no token provided
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      next();
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          role: true,
          firstName: true,
          lastName: true,
          kycStatus: true,
          phoneVerified: true,
          emailVerified: true,
          isActive: true,
        },
      });

      if (user && user.isActive) {
        req.user = user;
      }
    } catch {
      // Ignore token errors for optional auth
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue without authentication
  }
}