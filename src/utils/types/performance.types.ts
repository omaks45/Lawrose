/* eslint-disable prettier/prettier */
export interface CacheOptions {
  ttl: number; // Time to live in seconds
  maxSize: number; // Maximum cache size
  strategy: 'lru' | 'fifo' | 'lfu'; // Cache eviction strategy
}

export interface ValidationBatch<T = any> {
  value: T;
  validator: string;
  options?: Record<string, any>;
  fieldName?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface MagicLinkToken {
  token: string;
  hash: string;
  expires: Date;
  email: string;
}

export interface EmailVerificationToken {
  token: string;
  hash: string;
  expires: Date;
  email: string;
}

// Performance monitoring interfaces
export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  hitRate: number;
}