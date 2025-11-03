import {
  hashPassword,
  verifyPassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  extractTokenFromHeader,
  generateSecureToken,
  verifySecureToken,
} from '../../utils/auth';

describe('Auth Utils', () => {
  const testUser = {
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'BUYER' as const,
  };

  describe('Password hashing', () => {
    it('should hash password correctly', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50); // bcrypt hashes are typically 60 chars
    });

    it('should verify correct password', async () => {
      const password = 'testpassword123';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(password, hash);

      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'testpassword123';
      const wrongPassword = 'wrongpassword';
      const hash = await hashPassword(password);
      const isValid = await verifyPassword(wrongPassword, hash);

      expect(isValid).toBe(false);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'testpassword123';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      
      // Both should still verify correctly
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('JWT token generation', () => {
    it('should generate access token', () => {
      const token = generateAccessToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate refresh token', () => {
      const token = generateRefreshToken(testUser);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
    });

    it('should generate different tokens for same user', () => {
      const token1 = generateAccessToken(testUser);
      const token2 = generateAccessToken(testUser);

      expect(token1).not.toBe(token2);
    });
  });

  describe('JWT token verification', () => {
    it('should verify valid access token', () => {
      const token = generateAccessToken(testUser);
      const payload = verifyAccessToken(token);

      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
      expect(payload.role).toBe(testUser.role);
    });

    it('should verify valid refresh token', () => {
      const token = generateRefreshToken(testUser);
      const payload = verifyRefreshToken(token);

      expect(payload.userId).toBe(testUser.id);
      expect(payload.email).toBe(testUser.email);
      expect(payload.role).toBe(testUser.role);
    });

    it('should throw error for invalid access token', () => {
      expect(() => {
        verifyAccessToken('invalid-token');
      }).toThrow('INVALID_ACCESS_TOKEN');
    });

    it('should throw error for invalid refresh token', () => {
      expect(() => {
        verifyRefreshToken('invalid-token');
      }).toThrow('INVALID_REFRESH_TOKEN');
    });

    it('should throw error for malformed token', () => {
      expect(() => {
        verifyAccessToken('not.a.jwt');
      }).toThrow('INVALID_ACCESS_TOKEN');
    });

    it('should handle empty token', () => {
      expect(() => {
        verifyAccessToken('');
      }).toThrow('INVALID_ACCESS_TOKEN');
    });
  });

  describe('Token extraction from headers', () => {
    it('should extract token from valid Bearer header', () => {
      const token = 'valid-jwt-token';
      const header = `Bearer ${token}`;
      const extracted = extractTokenFromHeader(header);

      expect(extracted).toBe(token);
    });

    it('should return null for missing header', () => {
      const extracted = extractTokenFromHeader(undefined);
      expect(extracted).toBeNull();
    });

    it('should return null for invalid header format', () => {
      const extracted1 = extractTokenFromHeader('InvalidFormat token');
      const extracted2 = extractTokenFromHeader('Bearer');
      const extracted3 = extractTokenFromHeader('token-without-bearer');

      expect(extracted1).toBeNull();
      expect(extracted2).toBeNull();
      expect(extracted3).toBeNull();
    });

    it('should return null for empty header', () => {
      const extracted = extractTokenFromHeader('');
      expect(extracted).toBeNull();
    });
  });

  describe('Secure token generation and verification', () => {
    it('should generate secure token', () => {
      const token = generateSecureToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(10);
    });

    it('should verify valid secure token', () => {
      const token = generateSecureToken();
      const isValid = verifySecureToken(token);

      expect(isValid).toBe(true);
    });

    it('should reject invalid secure token', () => {
      const isValid = verifySecureToken('invalid-token');
      expect(isValid).toBe(false);
    });

    it('should generate different secure tokens', () => {
      const token1 = generateSecureToken();
      const token2 = generateSecureToken();

      expect(token1).not.toBe(token2);
    });

    it('should handle empty secure token', () => {
      const isValid = verifySecureToken('');
      expect(isValid).toBe(false);
    });
  });

  describe('Token payload validation', () => {
    it('should include correct payload in access token', () => {
      const token = generateAccessToken(testUser);
      const payload = verifyAccessToken(token);

      expect(payload).toHaveProperty('userId');
      expect(payload).toHaveProperty('email');
      expect(payload).toHaveProperty('role');
      expect(payload).toHaveProperty('iat'); // issued at
      expect(payload).toHaveProperty('exp'); // expires at
      expect(payload).toHaveProperty('iss'); // issuer
      expect(payload).toHaveProperty('aud'); // audience
    });

    it('should include correct issuer and audience', () => {
      const token = generateAccessToken(testUser);
      const payload = verifyAccessToken(token);

      expect(payload.iss).toBe('equipment-marketplace');
      expect(payload.aud).toBe('equipment-marketplace-users');
    });

    it('should have expiration time in the future', () => {
      const token = generateAccessToken(testUser);
      const payload = verifyAccessToken(token);
      const now = Math.floor(Date.now() / 1000);

      expect(payload.exp).toBeGreaterThan(now);
    });
  });
});