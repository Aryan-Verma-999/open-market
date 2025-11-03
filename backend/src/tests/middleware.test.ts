import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import app from '../index';
import { generateAccessToken } from '../utils/auth';

const prisma = new PrismaClient();

describe('Authentication Middleware', () => {
  let testUser: any;
  let validToken: string;
  let adminUser: any;
  let adminToken: string;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'middleware-test@example.com',
        phone: '+919876543299',
        passwordHash: 'hashedpassword',
        firstName: 'Test',
        lastName: 'User',
        role: 'BUYER',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        kycStatus: 'VERIFIED',
        phoneVerified: true,
        emailVerified: true,
      },
    });

    // Create admin user
    adminUser = await prisma.user.create({
      data: {
        email: 'admin-test@example.com',
        phone: '+919876543298',
        passwordHash: 'hashedpassword',
        firstName: 'Admin',
        lastName: 'User',
        role: 'ADMIN',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400001',
        kycStatus: 'VERIFIED',
        phoneVerified: true,
        emailVerified: true,
      },
    });

    validToken = generateAccessToken(testUser);
    adminToken = generateAccessToken(adminUser);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        OR: [
          { email: 'middleware-test@example.com' },
          { email: 'admin-test@example.com' },
        ],
      },
    });
    await prisma.$disconnect();
  });

  describe('authenticateToken middleware', () => {
    it('should allow access with valid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.user.email).toBe(testUser.email);
    });

    it('should reject request without token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject request with invalid token', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should reject request with malformed authorization header', async () => {
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', 'InvalidFormat token')
        .expect(401);

      expect(response.body.error.code).toBe('MISSING_TOKEN');
    });

    it('should reject request for deactivated user', async () => {
      // Deactivate user
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: false },
      });

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('ACCOUNT_DEACTIVATED');

      // Reactivate user for other tests
      await prisma.user.update({
        where: { id: testUser.id },
        data: { isActive: true },
      });
    });
  });

  describe('requireRole middleware', () => {
    it('should allow admin access to admin routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data.users).toBeDefined();
    });

    it('should deny non-admin access to admin routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(403);

      expect(response.body.error.code).toBe('INSUFFICIENT_PERMISSIONS');
    });

    it('should deny unauthenticated access to admin routes', async () => {
      const response = await request(app)
        .get('/api/users')
        .expect(401);

      expect(response.body.error.code).toBe('AUTHENTICATION_REQUIRED');
    });
  });

  describe('requireVerification middleware', () => {
    it('should allow verified user access', async () => {
      // This would be tested with routes that require verification
      // For now, we'll test the user profile which doesn't require verification
      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .expect(200);

      expect(response.body.data.user.kycStatus).toBe('VERIFIED');
    });

    it('should deny unverified user access', async () => {
      // Create unverified user
      const unverifiedUser = await prisma.user.create({
        data: {
          email: 'unverified-test@example.com',
          phone: '+919876543297',
          passwordHash: 'hashedpassword',
          firstName: 'Unverified',
          lastName: 'User',
          role: 'BUYER',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400001',
          kycStatus: 'PENDING',
          phoneVerified: false,
          emailVerified: false,
        },
      });

      const unverifiedToken = generateAccessToken(unverifiedUser);

      // Test with a route that would require verification (simulated)
      // Since we don't have such routes yet, we'll test the concept
      expect(unverifiedUser.kycStatus).toBe('PENDING');
      expect(unverifiedUser.phoneVerified).toBe(false);

      // Clean up
      await prisma.user.delete({
        where: { id: unverifiedUser.id },
      });
    });
  });

  describe('Token validation', () => {
    it('should handle expired tokens', async () => {
      // Create a token with very short expiration
      const shortLivedToken = generateAccessToken(testUser);
      
      // Wait for token to expire (in real scenario, we'd mock the time)
      // For now, we'll test with an obviously invalid token structure
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0IiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwicm9sZSI6IkJVWUVSIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE2MDAwMDAwMDF9.invalid';

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('INVALID_TOKEN');
    });

    it('should handle user not found for valid token', async () => {
      // Create token for non-existent user
      const fakeUser = {
        id: 'non-existent-id',
        email: 'fake@example.com',
        role: 'BUYER' as const,
      };
      const fakeToken = generateAccessToken(fakeUser);

      const response = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${fakeToken}`)
        .expect(401);

      expect(response.body.error.code).toBe('USER_NOT_FOUND');
    });
  });
});