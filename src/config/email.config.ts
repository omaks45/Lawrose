/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  transport: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    secure: true, // Use TLS
    port: 465,
    tls: {
      rejectUnauthorized: false,
    },
  },
  defaults: {
    from: `"Lawrose Store" <${process.env.EMAIL_USER}>`,
    replyTo: process.env.EMAIL_USER,
  },
  templates: {
    emailVerification: {
      subject: 'Verify Your Email - Lawrose Store',
      template: 'verification-email',
    },
    magicLink: {
      subject: 'Your Magic Link - Lawrose Store',
      template: 'magic-link-email',
    },
    welcomeEmail: {
      subject: 'Welcome to Lawrose Store!',
      template: 'welcome-email',
    },
    passwordReset: {
      subject: 'Reset Your Password - Lawrose Store',
      template: 'password-reset-email',
    },
    orderConfirmation: {
      subject: 'Order Confirmation - Lawrose Store',
      template: 'order-confirmation-email',
    },
    shippingUpdate: {
      subject: 'Shipping Update - Lawrose Store',
      template: 'shipping-update-email',
    },
  },
  rateLimits: {
    verificationEmail: {
      maxAttempts: 5,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    magicLink: {
      maxAttempts: 3,
      windowMs: 15 * 60 * 1000, // 15 minutes
    },
    passwordReset: {
      maxAttempts: 3,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
  },
  // Cloudinary configuration for email attachments/images
  cloudinary: {
    cloudName: process.env.CLOUDINARY_NAME,
    apiKey: process.env.CLOUDINARY_KEY,
    apiSecret: process.env.CLOUDINARY_SECRET,
    secure: true,
    folder: 'lawrose/email-assets',
  },
  // Email queue settings
  queue: {
    name: 'email-queue',
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 50,
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    },
  },
  // Base URLs for email links
  urls: {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3000',
    api: process.env.API_URL || 'http://localhost:5000',
    verificationEndpoint: '/auth/verify-email',
    magicLinkEndpoint: '/auth/magic-link',
    passwordResetEndpoint: '/auth/reset-password',
  },
}));