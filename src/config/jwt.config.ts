/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  secret: process.env.JWT_SECRET || 'default-secret-key',
  signOptions: {
    expiresIn: '30m', // Access token expires in 30 minutes
    issuer: 'lawrose-user-service',
    audience: 'lawrose-app',
    algorithm: 'HS256',
  },
  verifyOptions: {
    issuer: 'lawrose-user-service',
    audience: 'lawrose-app',
    algorithms: ['HS256'],
    clockTolerance: 60, // 1 minute clock tolerance
  },
  refresh: {
    secret: process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET + '-refresh',
    expiresIn: '7d', // Refresh token expires in 7 days
    issuer: 'lawrose-user-service',
    audience: 'lawrose-app',
    algorithm: 'HS256',
  },
  emailVerification: {
    secret: process.env.JWT_EMAIL_SECRET || process.env.JWT_SECRET + '-email',
    expiresIn: '24h', // Email verification token expires in 24 hours
    issuer: 'lawrose-user-service',
    audience: 'lawrose-email',
    algorithm: 'HS256',
  },
  magicLink: {
    secret: process.env.JWT_MAGIC_SECRET || process.env.JWT_SECRET + '-magic',
    expiresIn: '15m', // Magic link expires in 15 minutes
    issuer: 'lawrose-user-service',
    audience: 'lawrose-magic',
    algorithm: 'HS256',
  },
  resetPassword: {
    secret: process.env.JWT_RESET_SECRET || process.env.JWT_SECRET + '-reset',
    expiresIn: '1h', // Password reset token expires in 1 hour
    issuer: 'lawrose-user-service',
    audience: 'lawrose-reset',
    algorithm: 'HS256',
  },
}));