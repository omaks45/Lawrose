/* eslint-disable prettier/prettier */
import { registerAs } from '@nestjs/config';

export default registerAs('kafka', () => ({
  clientId: process.env.KAFKA_CLIENT_ID || 'LawUser',
  groupId: process.env.KAFKA_GROUP_ID || 'LawUser-group',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['kafka:9092'],
  consumer: {
    groupId: process.env.KAFKA_GROUP_ID || 'LawUser-group',
    allowAutoTopicCreation: true,
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
    sessionTimeout: 30000,
    heartbeatInterval: 3000,
    maxBytesPerPartition: 1048576,
    minBytes: 1,
    maxBytes: 10485760,
    maxWaitTimeInMs: 5000,
  },
  producer: {
    allowAutoTopicCreation: true,
    transactionTimeout: 30000,
    retry: {
      initialRetryTime: 100,
      retries: 8,
    },
    maxInFlightRequests: 1,
    idempotent: true,
    acks: -1,
  },
  topics: {
    userEvents: 'user-events',
    authEvents: 'auth-events',
    orderEvents: 'order-events',
    paymentEvents: 'payment-events',
    cartEvents: 'cart-events',
  },
  ssl: process.env.NODE_ENV === 'production',
  sasl: process.env.NODE_ENV === 'production' ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  } : undefined,
}));