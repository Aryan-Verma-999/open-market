import { prisma } from '../lib/database';
import { redis } from '../lib/redis';
import { 
  hashPassword, 
  verifyPassword, 
  generateTokenPair, 
  verifyRefreshToken,
  generateSecureToken,
  TokenPair 
} from '../utils/auth';
import { executeWithErrorHandling, DatabaseError } from '../utils/database';
import { User } from '@prisma/client';

export interface RegisterUserData {
  email: string;
  phone: string;
  password: string;
  firstName: string;
  lastName: string;
  company?: string;
  role: 'BUYER' | 'SELLER' | 'BOTH';
  city: string;
  state: string;
  pincode: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: Omit<User, 'passwordHash'>;
  tokens: TokenPair;
}

export class AuthService {
  /**
   * Register a new user
   */
  static async registerUser(userData: RegisterUserData): Promise<AuthResponse> {
    return executeWithErrorHandling(async () => {
      // Check if user already exists
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: userData.email },
            { phone: userData.phone },
          ],
        },
      });

      if (existingUser) {
        if (existingUser.email === userData.email) {
          throw new DatabaseError('An account with this email already exists', 'EMAIL_EXISTS');
        }
        if (existingUser.phone === userData.phone) {
          throw new DatabaseError('An account with this phone number already exists', 'PHONE_EXISTS');
        }
      }

      // Hash password
      const passwordHash = await hashPassword(userData.password);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: userData.email,
          phone: userData.phone,
          passwordHash,
          firstName: userData.firstName,
          lastName: userData.lastName,
          company: userData.company,
          role: userData.role,
          city: userData.city,
          state: userData.state,
          pincode: userData.pincode,
        },
      });

      // Generate tokens
      const tokens = generateTokenPair(user);

      // Store refresh token in Redis
      await redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens,
      };
    });
  }

  /**
   * Login user with email and password
   */
  static async loginUser(credentials: LoginCredentials): Promise<AuthResponse> {
    return executeWithErrorHandling(async () => {
      // Find user by email
      const user = await prisma.user.findUnique({
        where: { email: credentials.email },
      });

      if (!user) {
        throw new DatabaseError('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      if (!user.isActive) {
        throw new DatabaseError('Account has been deactivated', 'ACCOUNT_DEACTIVATED');
      }

      // Verify password
      const isPasswordValid = await verifyPassword(credentials.password, user.passwordHash);
      if (!isPasswordValid) {
        throw new DatabaseError('Invalid email or password', 'INVALID_CREDENTIALS');
      }

      // Generate tokens
      const tokens = generateTokenPair(user);

      // Store refresh token in Redis
      await redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;

      return {
        user: userWithoutPassword,
        tokens,
      };
    });
  }

  /**
   * Refresh access token using refresh token
   */
  static async refreshToken(refreshToken: string): Promise<TokenPair> {
    return executeWithErrorHandling(async () => {
      // Verify refresh token
      let payload;
      try {
        payload = verifyRefreshToken(refreshToken);
      } catch (error) {
        throw new DatabaseError('Invalid or expired refresh token', 'INVALID_REFRESH_TOKEN');
      }

      // Check if refresh token exists in Redis
      const storedToken = await redis.get(`refresh_token:${payload.userId}`);
      if (!storedToken || storedToken !== refreshToken) {
        throw new DatabaseError('Refresh token not found or invalid', 'INVALID_REFRESH_TOKEN');
      }

      // Get user
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: { id: true, email: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) {
        throw new DatabaseError('User not found or account deactivated', 'USER_NOT_FOUND');
      }

      // Generate new tokens
      const tokens = generateTokenPair(user);

      // Update refresh token in Redis
      await redis.setEx(`refresh_token:${user.id}`, 7 * 24 * 60 * 60, tokens.refreshToken);

      return tokens;
    });
  }

  /**
   * Logout user by invalidating refresh token
   */
  static async logoutUser(userId: string): Promise<void> {
    return executeWithErrorHandling(async () => {
      // Remove refresh token from Redis
      await redis.del(`refresh_token:${userId}`);
    });
  }

  /**
   * Get user profile
   */
  static async getUserProfile(userId: string): Promise<Omit<User, 'passwordHash'>> {
    return executeWithErrorHandling(async () => {
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new DatabaseError('User not found', 'USER_NOT_FOUND');
      }

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Update user profile
   */
  static async updateUserProfile(
    userId: string,
    updateData: Partial<Pick<User, 'firstName' | 'lastName' | 'company' | 'city' | 'state' | 'pincode'>>
  ): Promise<Omit<User, 'passwordHash'>> {
    return executeWithErrorHandling(async () => {
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      // Remove password hash from response
      const { passwordHash: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
  }

  /**
   * Change user password
   */
  static async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<void> {
    return executeWithErrorHandling(async () => {
      // Get user with password hash
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, passwordHash: true },
      });

      if (!user) {
        throw new DatabaseError('User not found', 'USER_NOT_FOUND');
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);
      if (!isCurrentPasswordValid) {
        throw new DatabaseError('Current password is incorrect', 'INVALID_CURRENT_PASSWORD');
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash: newPasswordHash,
          updatedAt: new Date(),
        },
      });

      // Invalidate all refresh tokens for this user
      await redis.del(`refresh_token:${userId}`);
    });
  }

  /**
   * Verify phone number
   */
  static async verifyPhone(userId: string, verificationCode: string): Promise<void> {
    return executeWithErrorHandling(async () => {
      // In a real implementation, you would verify the code against a stored value
      // For now, we'll just mark the phone as verified
      await prisma.user.update({
        where: { id: userId },
        data: {
          phoneVerified: true,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Verify email address
   */
  static async verifyEmail(userId: string, verificationToken: string): Promise<void> {
    return executeWithErrorHandling(async () => {
      // In a real implementation, you would verify the token
      // For now, we'll just mark the email as verified
      await prisma.user.update({
        where: { id: userId },
        data: {
          emailVerified: true,
          updatedAt: new Date(),
        },
      });
    });
  }

  /**
   * Request password reset
   */
  static async requestPasswordReset(email: string): Promise<string> {
    return executeWithErrorHandling(async () => {
      const user = await prisma.user.findUnique({
        where: { email },
        select: { id: true, email: true },
      });

      if (!user) {
        // Don't reveal if email exists or not
        throw new DatabaseError('If an account with this email exists, a password reset link has been sent', 'RESET_EMAIL_SENT');
      }

      // Generate reset token
      const resetToken = generateSecureToken();

      // Store reset token in Redis with 1 hour expiration
      await redis.setEx(`password_reset:${user.id}`, 60 * 60, resetToken);

      return resetToken;
    });
  }

  /**
   * Reset password using reset token
   */
  static async resetPassword(
    resetToken: string,
    newPassword: string
  ): Promise<void> {
    return executeWithErrorHandling(async () => {
      // Find user by reset token
      const keys = await redis.keys('password_reset:*');
      let userId: string | null = null;

      for (const key of keys) {
        const storedToken = await redis.get(key);
        if (storedToken === resetToken) {
          userId = key.split(':')[1];
          break;
        }
      }

      if (!userId) {
        throw new DatabaseError('Invalid or expired reset token', 'INVALID_RESET_TOKEN');
      }

      // Hash new password
      const passwordHash = await hashPassword(newPassword);

      // Update password
      await prisma.user.update({
        where: { id: userId },
        data: {
          passwordHash,
          updatedAt: new Date(),
        },
      });

      // Remove reset token
      await redis.del(`password_reset:${userId}`);

      // Invalidate all refresh tokens for this user
      await redis.del(`refresh_token:${userId}`);
    });
  }
}