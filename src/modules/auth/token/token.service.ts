/* eslint-disable prettier/prettier */
import {
  Injectable,
  Logger,
  InternalServerErrorException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { performance } from 'perf_hooks';
import Redis from 'ioredis';

interface TokenPayload {
  sub: string;
  email: string;
  emailVerified: boolean;
  type?: string;
  iat?: number;
  exp?: number;
}

interface TokenValidationResult {
  isValid: boolean;
  payload?: TokenPayload;
  error?: string;
}

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);
  private readonly ACCESS_TOKEN_EXPIRY = '15m';
  private readonly REFRESH_TOKEN_EXPIRY = '7d';
  private readonly VERIFICATION_TOKEN_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAGIC_LINK_EXPIRY = 10 * 60 * 1000; // 10 minutes

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
  ) {}

  /**
   * Generate JWT access token
   */
  async generateAccessToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    try {
      const startTime = performance.now();
      
      const tokenPayload = {
        ...payload,
        type: 'access',
      };

      const token = await this.jwtService.signAsync(tokenPayload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.ACCESS_TOKEN_EXPIRY,
        issuer: 'lawrose-user-service',
        audience: 'lawrose-app',
      });

      this.logger.debug(`Access token generated in ${performance.now() - startTime}ms`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to generate access token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate access token');
    }
  }

  /**
   * Generate JWT refresh token
   */
  async generateRefreshToken(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<string> {
    try {
      const startTime = performance.now();
      
      const tokenPayload = {
        ...payload,
        type: 'refresh',
      };

      const token = await this.jwtService.signAsync(tokenPayload, {
        secret: this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET'),
        expiresIn: this.REFRESH_TOKEN_EXPIRY,
        issuer: 'lawrose-user-service',
        audience: 'lawrose-app',
      });

      this.logger.debug(`Refresh token generated in ${performance.now() - startTime}ms`);
      return token;
    } catch (error) {
      this.logger.error(`Failed to generate refresh token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate refresh token');
    }
  }

  /**
   * Generate both access and refresh tokens
   */
  async generateTokenPair(payload: Omit<TokenPayload, 'type' | 'iat' | 'exp'>): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const startTime = performance.now();
    
    try {
      const [accessToken, refreshToken] = await Promise.all([
        this.generateAccessToken(payload),
        this.generateRefreshToken(payload),
      ]);

      this.logger.debug(`Token pair generated in ${performance.now() - startTime}ms`);
      
      return { accessToken, refreshToken };
    } catch (error) {
      this.logger.error(`Failed to generate token pair: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Validate JWT token
   */
  async validateToken(token: string, type: 'access' | 'refresh' = 'access'): Promise<TokenValidationResult> {
    try {
      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        return {
          isValid: false,
          error: 'Token has been revoked',
        };
      }

      const secret = type === 'refresh' 
        ? this.configService.get('JWT_REFRESH_SECRET') || this.configService.get('JWT_SECRET')
        : this.configService.get('JWT_SECRET');

      const payload = this.jwtService.verify(token, {
        secret,
        issuer: 'lawrose-user-service',
        audience: 'lawrose-app',
      }) as TokenPayload;

      // Verify token type matches expected type
      if (payload.type && payload.type !== type) {
        return {
          isValid: false,
          error: 'Invalid token type',
        };
      }

      return {
        isValid: true,
        payload,
      };
    } catch (error) {
      this.logger.warn(`Token validation failed: ${error.message}`);
      return {
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate secure verification token
   */
  generateVerificationToken(): string {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate magic link token
   */
  async generateMagicLinkToken(userId: string, email: string): Promise<string> {
    try {
      const token = randomBytes(32).toString('hex');
      const expiresAt = Date.now() + this.MAGIC_LINK_EXPIRY;

      const tokenData = {
        userId,
        email,
        expiresAt,
        type: 'magic_link',
      };

      const tokenKey = `magic_link:${email}:${token}`;
      await this.redisClient.setex(
        tokenKey,
        Math.floor(this.MAGIC_LINK_EXPIRY / 1000),
        JSON.stringify(tokenData),
      );

      return token;
    } catch (error) {
      this.logger.error(`Failed to generate magic link token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate magic link token');
    }
  }

  /**
   * Validate magic link token
   */
  async validateMagicLinkToken(token: string, email: string): Promise<{
    isValid: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      const tokenKey = `magic_link:${email}:${token}`;
      const cachedData = await this.redisClient.get(tokenKey);

      if (!cachedData) {
        return {
          isValid: false,
          error: 'Invalid or expired magic link token',
        };
      }

      const tokenData = JSON.parse(cachedData);

      if (Date.now() > tokenData.expiresAt) {
        await this.redisClient.del(tokenKey);
        return {
          isValid: false,
          error: 'Magic link token has expired',
        };
      }

      // Use timing-safe comparison for email
      const providedEmailBuffer = Buffer.from(email);
      const storedEmailBuffer = Buffer.from(tokenData.email);
      
      if (!timingSafeEqual(providedEmailBuffer, storedEmailBuffer)) {
        return {
          isValid: false,
          error: 'Invalid magic link token',
        };
      }

      return {
        isValid: true,
        userId: tokenData.userId,
      };
    } catch (error) {
      this.logger.error(`Magic link validation failed: ${error.message}`, error.stack);
      return {
        isValid: false,
        error: 'Failed to validate magic link token',
      };
    }
  }

  /**
   * Consume magic link token (use once)
   */
  async consumeMagicLinkToken(token: string, email: string): Promise<{
    isValid: boolean;
    userId?: string;
    error?: string;
  }> {
    const result = await this.validateMagicLinkToken(token, email);
    
    if (result.isValid) {
      // Remove the token after successful validation
      const tokenKey = `magic_link:${email}:${token}`;
      await this.redisClient.del(tokenKey);
    }
    
    return result;
  }

  /**
   * Blacklist a token (for logout)
   */
  async blacklistToken(token: string): Promise<void> {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.exp) {
        const ttl = decoded.exp - Math.floor(Date.now() / 1000);
        if (ttl > 0) {
          const tokenHash = this.hashToken(token);
          await this.redisClient.setex(`blacklist:${tokenHash}`, ttl, '1');
        }
      }
    } catch (error) {
      this.logger.error(`Failed to blacklist token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to blacklist token');
    }
  }

  /**
   * Check if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      const tokenHash = this.hashToken(token);
      const result = await this.redisClient.get(`blacklist:${tokenHash}`);
      return result !== null;
    } catch (error) {
      this.logger.error(`Failed to check token blacklist: ${error.message}`, error.stack);
      return false; // Fail safe - don't block valid tokens due to Redis issues
    }
  }

  /**
   * Get token expiration time
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      if (decoded && decoded.exp) {
        return new Date(decoded.exp * 1000);
      }
      return null;
    } catch (error) {
      this.logger.warn(`Failed to decode token: ${error.message}`);
      return null;
    }
  }

  /**
   * Extract user ID from token
   */
  extractUserIdFromToken(token: string): string | null {
    try {
      const decoded = this.jwtService.decode(token) as any;
      return decoded?.sub || null;
    } catch (error) {
      this.logger.warn(`Failed to extract user ID from token: ${error.message}`);
      return null;
    }
  }

  /**
   * Generate secure hash for token storage
   */
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generate verification token with expiration
   */
  async generateVerificationTokenWithExpiry(userId: string, email: string): Promise<{
    token: string;
    expiresAt: Date;
  }> {
    try {
      const token = this.generateVerificationToken();
      const expiresAt = new Date(Date.now() + this.VERIFICATION_TOKEN_EXPIRY);

      // Store in Redis for fast lookup
      const tokenKey = `verification:${email}:${token}`;
      const tokenData = {
        userId,
        email,
        expiresAt: expiresAt.getTime(),
        type: 'email_verification',
      };

      await this.redisClient.setex(
        tokenKey,
        Math.floor(this.VERIFICATION_TOKEN_EXPIRY / 1000),
        JSON.stringify(tokenData),
      );

      return { token, expiresAt };
    } catch (error) {
      this.logger.error(`Failed to generate verification token: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to generate verification token');
    }
  }

  /**
   * Validate verification token
   */
  async validateVerificationToken(token: string, email: string): Promise<{
    isValid: boolean;
    userId?: string;
    error?: string;
  }> {
    try {
      const tokenKey = `verification:${email}:${token}`;
      const cachedData = await this.redisClient.get(tokenKey);

      if (!cachedData) {
        return {
          isValid: false,
          error: 'Invalid or expired verification token',
        };
      }

      const tokenData = JSON.parse(cachedData);

      if (Date.now() > tokenData.expiresAt) {
        await this.redisClient.del(tokenKey);
        return {
          isValid: false,
          error: 'Verification token has expired',
        };
      }

      // Use timing-safe comparison for email
      const providedEmailBuffer = Buffer.from(email);
      const storedEmailBuffer = Buffer.from(tokenData.email);
      
      if (!timingSafeEqual(providedEmailBuffer, storedEmailBuffer)) {
        return {
          isValid: false,
          error: 'Invalid verification token',
        };
      }

      return {
        isValid: true,
        userId: tokenData.userId,
      };
    } catch (error) {
      this.logger.error(`Verification token validation failed: ${error.message}`, error.stack);
      return {
        isValid: false,
        error: 'Failed to validate verification token',
      };
    }
  }

  /**
   * Consume verification token (use once)
   */
  async consumeVerificationToken(token: string, email: string): Promise<{
    isValid: boolean;
    userId?: string;
    error?: string;
  }> {
    const result = await this.validateVerificationToken(token, email);
    
    if (result.isValid) {
      // Remove the token after successful validation
      const tokenKey = `verification:${email}:${token}`;
      await this.redisClient.del(tokenKey);
    }
    
    return result;
  }

  /**
   * Clean up expired tokens from Redis
   */
  async cleanupExpiredTokens(): Promise<{ removedCount: number }> {
    try {
      const patterns = ['magic_link:*', 'verification:*', 'blacklist:*'];
      let removedCount = 0;

      for (const pattern of patterns) {
        const keys = await this.redisClient.keys(pattern);
        if (keys.length > 0) {
          // Process in batches to avoid blocking Redis
          const batchSize = 100;
          for (let i = 0; i < keys.length; i += batchSize) {
            const batch = keys.slice(i, i + batchSize);
            await this.redisClient.del(...batch);
            removedCount += batch.length;
          }
        }
      }

      this.logger.log(`Cleaned up ${removedCount} expired tokens`);
      return { removedCount };
    } catch (error) {
      this.logger.error(`Failed to cleanup expired tokens: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to cleanup expired tokens');
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ status: string; latency?: number }> {
    try {
      const start = performance.now();
      await this.redisClient.ping();
      const latency = performance.now() - start;
      
      return {
        status: 'healthy',
        latency: Math.round(latency * 100) / 100, // Round to 2 decimal places
      };
    } catch (error) {
      this.logger.error(`Redis health check failed: ${error.message}`);
      return {
        status: 'unhealthy',
      };
    }
  }
}