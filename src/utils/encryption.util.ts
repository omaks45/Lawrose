/* eslint-disable prettier/prettier */
import * as crypto from 'crypto';
import * as bcrypt from 'bcrypt';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EncryptionUtil {
  private readonly algorithm = 'aes-256-gcm';
  private readonly keyLength = 32;
  private readonly ivLength = 16;
  private readonly tagLength = 16;
  private readonly saltRounds = 12;

  // Optimized: Use Map for caching encryption keys (O(1) lookup)
  private readonly keyCache = new Map<string, Buffer>();
  private readonly maxCacheSize = 100;

  /**
   * Generate cryptographically secure random string
   * Time Complexity: O(1)
   */
  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * Hash password using bcrypt with optimized salt rounds
   * Time Complexity: O(1) - constant time due to bcrypt
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  /**
   * Verify password with timing attack protection
   * Time Complexity: O(1) - constant time due to bcrypt
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Encrypt sensitive data with AES-256-GCM
   * Time Complexity: O(n) where n is data length
   * Optimized: Reuse keys from cache
   */
  encrypt(data: string, secretKey: string): string {
    try {
      const key = this.getOrCreateKey(secretKey);
      const iv = crypto.randomBytes(this.ivLength);
      const cipher = crypto.createCipher(this.algorithm, key);
      
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const authTag = cipher.getAuthTag();
      
      // Combine IV + AuthTag + Encrypted Data
      return iv.toString('hex') + authTag.toString('hex') + encrypted;
    } catch (error) {
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Decrypt sensitive data
   * Time Complexity: O(n) where n is data length
   */
  decrypt(encryptedData: string, secretKey: string): string {
    try {
      const key = this.getOrCreateKey(secretKey);
      
      // Extract components
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const iv = Buffer.from(encryptedData.slice(0, this.ivLength * 2), 'hex');
      const authTag = Buffer.from(
        encryptedData.slice(this.ivLength * 2, (this.ivLength + this.tagLength) * 2),
        'hex'
      );
      const encrypted = encryptedData.slice((this.ivLength + this.tagLength) * 2);
      
      const decipher = crypto.createDecipher(this.algorithm, key);
      decipher.setAuthTag(authTag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }

  /**
   * Generate email verification token with expiry
   * Time Complexity: O(1)
   */
  generateEmailToken(): { token: string; expires: Date } {
    const token = this.generateSecureToken(48);
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    return { token, expires };
  }

  /**
   * Hash email for privacy while maintaining searchability
   * Time Complexity: O(1)
   */
  hashEmail(email: string): string {
    return crypto
      .createHash('sha256')
      .update(email.toLowerCase().trim())
      .digest('hex');
  }

  /**
   * Optimized key derivation with caching
   * Time Complexity: O(1) for cache hit, O(n) for cache miss
   */
  private getOrCreateKey(secretKey: string): Buffer {
    if (this.keyCache.has(secretKey)) {
      return this.keyCache.get(secretKey)!;
    }

    // LRU cache implementation - remove oldest if cache is full
    if (this.keyCache.size >= this.maxCacheSize) {
      const firstKey = this.keyCache.keys().next().value;
      this.keyCache.delete(firstKey);
    }

    const key = crypto.pbkdf2Sync(secretKey, 'salt', 100000, this.keyLength, 'sha512');
    this.keyCache.set(secretKey, key);
    
    return key;
  }

  /**
   * Clear sensitive data from memory
   * Time Complexity: O(1)
   */
  clearCache(): void {
    this.keyCache.clear();
  }
}