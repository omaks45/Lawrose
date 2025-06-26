/* eslint-disable prettier/prettier */
import { Module, Global, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import redisConfig from '../../../config/redis.config';

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('RedisModule');
        
        try {
          const config = configService.get('redis');
          
          logger.log('Initializing Redis connection...');
          logger.debug(`Redis Config: ${JSON.stringify({
            host: config.host,
            port: config.port,
            db: config.db,
            keyPrefix: config.keyPrefix,
          })}`);

          const redis = new Redis({
            host: config.host,
            port: config.port,
            password: config.password,
            username: config.username,
            db: config.db,
            enableReadyCheck: config.enableReadyCheck,
            maxRetriesPerRequest: config.maxRetriesPerRequest,
            lazyConnect: config.lazyConnect,
            keepAlive: config.keepAlive,
            family: config.family,
            keyPrefix: config.keyPrefix,
            connectTimeout: config.connectTimeout,
            commandTimeout: config.commandTimeout,
            showFriendlyErrorStack: config.showFriendlyErrorStack,
            // Valid ioredis options only
            //autoResend: true,
            //autoResubscribe: true,
            //enableOfflineQueue: true,
            //retryDelayOnError: 100, // This is the correct property name
          });

          // Event listeners for connection monitoring
          redis.on('connect', () => {
            logger.log('Redis client connected successfully');
          });

          redis.on('ready', () => {
            logger.log('Redis client ready to receive commands');
          });

          redis.on('error', (error) => {
            logger.error(`Redis connection error: ${error.message}`, error.stack);
          });

          redis.on('close', () => {
            logger.warn('Redis connection closed');
          });

          redis.on('reconnecting', (delay) => {
            logger.log(`Redis client reconnecting in ${delay}ms`);
          });

          redis.on('end', () => {
            logger.warn('Redis connection ended');
          });

          // Test the connection
          if (!config.lazyConnect) {
            await redis.ping();
            logger.log('Redis connection test successful');
          }

          return redis;
        } catch (error) {
          logger.error(`Failed to initialize Redis: ${error.message}`, error.stack);
          throw error;
        }
      },
      inject: [ConfigService],
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class TokenModule {
  private static readonly logger = new Logger(TokenModule.name);

  static async onApplicationShutdown() {
    TokenModule.logger.log('Shutting down Redis connections...');
  }
}