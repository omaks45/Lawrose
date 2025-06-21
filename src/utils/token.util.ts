/* eslint-disable prettier/prettier */
import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class TokenUtil {
  // Optimized: Use Map for token blacklist with TTL
  private readonly blacklistedTokens = new Map<string, number>();
  private readonly maxBlacklistSize = 10000;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    // Clean expired tokens every hour
    setInterval(() => this.cleanExpiredTokens(), 60 * 60 * 1000);
  }

  /**
   * Generate JWT access token
   * Time Complexity: O(1)
   */
  generateAccessToken(payload: {
    userId: string;
    email: string;
    emailVerified: boolean;
  }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_ACCESS_SECRET'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN', '30m'),
    });
  }

  /**
   * Generate JWT refresh token
   * Time Complexity: O(1)
   */
  generateRefreshToken(payload: { userId: string }): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });
  }

  /**
   * Generate token pair with optimized payload
   * Time Complexity: O(1)
   */
  generateTokenPair(user: {
    id: string;
    email: string;
    emailVerified: boolean;
  }): { accessToken: string; refreshToken: string } {
    const accessPayload = {
      userId: user.id,
      email: user.email,
      emailVerified: user.emailVerified,
    };

    const refreshPayload = {
      userId: user.id,
    };

    return {
      accessToken: this.generateAccessToken(accessPayload),
      refreshToken: this.generateRefreshToken(refreshPayload),
    };
  }

  /**
   * Verify JWT token with blacklist check
   * Time Complexity: O(1)
   */
  async verifyToken(token: string, secret?: string): Promise<any> {
    // Check blacklist first (O(1) lookup)
    if (this.isTokenBlacklisted(token)) {
      throw new Error('Token has been revoked');
    }

    try {
      return this.jwtService.verify(token, {
        secret: secret || this.configService.get('JWT_ACCESS_SECRET'),
      });
    } catch (error) {
      throw new Error(`Invalid token: ${error.message}`);
    }
  }

  /**
   * Extract token from Authorization header
   * Time Complexity: O(1)
   */
  extractTokenFromHeader(authHeader: string): string | null {
    if (!authHeader || typeof authHeader !== 'string') {
      return null;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }

  /**
   * Generate magic link token for passwordless auth
   * Time Complexity: O(1)
   */
  generateMagicLinkToken(email: string): {
    token: string;
    expires: Date;
    hash: string;
  } {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    
    // Create hash for database storage
    const hash = crypto
      .createHash('sha256')
      .update(`${token}:${email}:${expires.getTime()}`)
      .digest('hex');

    return { token, expires, hash };
  }

  /**
   * Verify magic link token
   * Time Complexity: O(1)
   */
  verifyMagicLinkToken(
    token: string,
    email: string,
    storedHash: string,
    expires: Date,
  ): boolean {
    // Check expiration first
    if (new Date() > expires) {
      return false;
    }

    // Recreate hash and compare
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${token}:${email}:${expires.getTime()}`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(storedHash),
      Buffer.from(expectedHash),
    );
  }

  /**
   * Add token to blacklist (for logout/revocation)
   * Time Complexity: O(1)
   */
  blacklistToken(token: string, expiresAt?: Date): void {
    const expiry = expiresAt ? expiresAt.getTime() : Date.now() + 24 * 60 * 60 * 1000;
    
    // LRU eviction if cache is full
    if (this.blacklistedTokens.size >= this.maxBlacklistSize) {
      const oldestKey = this.blacklistedTokens.keys().next().value;
      this.blacklistedTokens.delete(oldestKey);
    }

    this.blacklistedTokens.set(token, expiry);
  }

  /**
   * Check if token is blacklisted
   * Time Complexity: O(1)
   */
  isTokenBlacklisted(token: string): boolean {
    const expiry = this.blacklistedTokens.get(token);
    
    if (!expiry) return false;
    
    // Remove if expired
    if (Date.now() > expiry) {
      this.blacklistedTokens.delete(token);
      return false;
    }
    
    return true;
  }

  /**
   * Clean expired tokens from blacklist
   * Time Complexity: O(n) but runs in background
   */
  private cleanExpiredTokens(): void {
    const now = Date.now();
    const expiredTokens: string[] = [];

    this.blacklistedTokens.forEach((expiry, token) => {
      if (now > expiry) {
        expiredTokens.push(token);
      }
    });

    expiredTokens.forEach(token => {
      this.blacklistedTokens.delete(token);
    });
  }

  /**
   * Generate email verification token
   * Time Complexity: O(1)
   */
  generateEmailVerificationToken(email: string): {
    token: string;
    hash: string;
    expires: Date;
  } {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    const hash = crypto
      .createHash('sha256')
      .update(`${token}:${email}:verification`)
      .digest('hex');

    return { token, hash, expires };
  }

  /**
   * Verify email verification token
   * Time Complexity: O(1)
   */
  verifyEmailVerificationToken(
    token: string,
    email: string,
    storedHash: string,
  ): boolean {
    const expectedHash = crypto
      .createHash('sha256')
      .update(`${token}:${email}:verification`)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(storedHash),
      Buffer.from(expectedHash),
    );
  }

  /**
   * Decode token without verification (for inspection)
   * Time Complexity: O(1)
   */
  decodeToken(token: string): any {
    return this.jwtService.decode(token);
  }

  /**
   * Get token expiration time
   * Time Complexity: O(1)
   */
  getTokenExpiration(token: string): Date | null {
    try {
      const decoded = this.decodeToken(token);
      return decoded?.exp ? new Date(decoded.exp * 1000) : null;
    } catch {
      return null;
    }
  }

  /**
   * Check if token is expired
   * Time Complexity: O(1)
   */
  isTokenExpired(token: string): boolean {
    const expiration = this.getTokenExpiration(token);
    return expiration ? new Date() > expiration : true;
  }
}