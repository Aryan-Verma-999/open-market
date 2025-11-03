import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { validateRequest } from '../utils/validation';
import { 
  userRegistrationSchema, 
  userLoginSchema, 
  userUpdateSchema 
} from '../utils/validation';
import { authenticateToken } from '../middleware/auth';
import { DatabaseError } from '../utils/database';

const router = Router();

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post('/register', validateRequest(userRegistrationSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.registerUser(req.body);
    
    res.status(201).json({
      message: 'User registered successfully',
      data: result,
    });
  } catch (error) {
    console.error('Registration error:', error);
    
    if (error instanceof DatabaseError) {
      const statusCode = error.code === 'EMAIL_EXISTS' || error.code === 'PHONE_EXISTS' ? 409 : 400;
      res.status(statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'REGISTRATION_FAILED',
          message: 'Failed to register user',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

/**
 * POST /api/auth/login
 * Login user
 */
router.post('/login', validateRequest(userLoginSchema), async (req: Request, res: Response) => {
  try {
    const result = await AuthService.loginUser(req.body);
    
    res.json({
      message: 'Login successful',
      data: result,
    });
  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof DatabaseError) {
      const statusCode = error.code === 'INVALID_CREDENTIALS' ? 401 : 400;
      res.status(statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'LOGIN_FAILED',
          message: 'Failed to login user',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    const tokens = await AuthService.refreshToken(refreshToken);
    
    res.json({
      message: 'Token refreshed successfully',
      data: { tokens },
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    
    if (error instanceof DatabaseError) {
      res.status(401).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Failed to refresh token',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

/**
 * POST /api/auth/logout
 * Logout user
 */
router.post('/logout', authenticateToken, async (req: Request, res: Response) => {
  try {
    await AuthService.logoutUser(req.user!.id);
    
    res.json({
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('Logout error:', error);
    
    res.status(500).json({
      error: {
        code: 'LOGOUT_FAILED',
        message: 'Failed to logout user',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post('/change-password', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PASSWORDS',
          message: 'Current password and new password are required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 8 characters long',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    await AuthService.changePassword(req.user!.id, currentPassword, newPassword);
    
    res.json({
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Change password error:', error);
    
    if (error instanceof DatabaseError) {
      const statusCode = error.code === 'INVALID_CURRENT_PASSWORD' ? 400 : 500;
      res.status(statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'PASSWORD_CHANGE_FAILED',
          message: 'Failed to change password',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

/**
 * POST /api/auth/verify-phone
 * Verify phone number
 */
router.post('/verify-phone', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { verificationCode } = req.body;
    
    if (!verificationCode) {
      return res.status(400).json({
        error: {
          code: 'MISSING_VERIFICATION_CODE',
          message: 'Verification code is required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    await AuthService.verifyPhone(req.user!.id, verificationCode);
    
    res.json({
      message: 'Phone number verified successfully',
    });
  } catch (error) {
    console.error('Phone verification error:', error);
    
    res.status(500).json({
      error: {
        code: 'PHONE_VERIFICATION_FAILED',
        message: 'Failed to verify phone number',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/auth/verify-email
 * Verify email address
 */
router.post('/verify-email', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { verificationToken } = req.body;
    
    if (!verificationToken) {
      return res.status(400).json({
        error: {
          code: 'MISSING_VERIFICATION_TOKEN',
          message: 'Verification token is required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    await AuthService.verifyEmail(req.user!.id, verificationToken);
    
    res.json({
      message: 'Email address verified successfully',
    });
  } catch (error) {
    console.error('Email verification error:', error);
    
    res.status(500).json({
      error: {
        code: 'EMAIL_VERIFICATION_FAILED',
        message: 'Failed to verify email address',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        error: {
          code: 'MISSING_EMAIL',
          message: 'Email address is required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    const resetToken = await AuthService.requestPasswordReset(email);
    
    // In a real implementation, you would send this token via email
    // For development, we'll return it in the response
    res.json({
      message: 'Password reset instructions have been sent to your email',
      ...(process.env.NODE_ENV === 'development' && { resetToken }),
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    
    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account with this email exists, a password reset link has been sent',
    });
  }
});

/**
 * POST /api/auth/reset-password
 * Reset password using reset token
 */
router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { resetToken, newPassword } = req.body;
    
    if (!resetToken || !newPassword) {
      return res.status(400).json({
        error: {
          code: 'MISSING_REQUIRED_FIELDS',
          message: 'Reset token and new password are required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    if (newPassword.length < 8) {
      return res.status(400).json({
        error: {
          code: 'WEAK_PASSWORD',
          message: 'New password must be at least 8 characters long',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    await AuthService.resetPassword(resetToken, newPassword);
    
    res.json({
      message: 'Password reset successfully',
    });
  } catch (error) {
    console.error('Password reset error:', error);
    
    if (error instanceof DatabaseError) {
      res.status(400).json({
        error: {
          code: error.code,
          message: error.message,
          timestamp: new Date().toISOString(),
        },
      });
    } else {
      res.status(500).json({
        error: {
          code: 'PASSWORD_RESET_FAILED',
          message: 'Failed to reset password',
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
});

export default router;