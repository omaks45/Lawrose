/* eslint-disable prettier/prettier */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import Redis from 'ioredis';
import { Kafka } from 'kafkajs';

@Injectable()
export class ConnectionService implements OnModuleInit {
  private readonly logger = new Logger(ConnectionService.name);
  private redis: Redis;
  private kafka: Kafka;

  constructor(
    private configService: ConfigService,
    @InjectConnection() private mongoConnection: Connection,
  ) {}

  async onModuleInit() {
    if (this.configService.get('LOG_DB_CONNECTION')) {
      this.setupMongoLogging();
    }
    
    if (this.configService.get('LOG_REDIS_CONNECTION')) {
      this.setupRedisLogging();
    }
    
    if (this.configService.get('LOG_KAFKA_CONNECTION')) {
      this.setupKafkaLogging();
    }
  }

  private setupMongoLogging() {
    const mongoUrl = this.configService.get('MONGO_URL');
    
    this.mongoConnection.on('connected', () => {
      this.logger.log('MongoDB Connected Successfully');
      this.logger.log(`Connected to: ${this.maskConnectionString(mongoUrl)}`);
      this.logger.log(` Database: ${this.mongoConnection.name}`);
      this.logger.log(`Connection State: ${this.getMongoConnectionState()}`);
    });

    this.mongoConnection.on('error', (error) => {
      this.logger.error('MongoDB Connection Error:', error.message);
      this.logger.error(`Connection State: ${this.getMongoConnectionState()}`);
    });

    this.mongoConnection.on('disconnected', () => {
      this.logger.warn('MongoDB Disconnected');
      this.logger.warn(`Connection State: ${this.getMongoConnectionState()}`);
    });

    this.mongoConnection.on('reconnected', () => {
      this.logger.log('MongoDB Reconnected');
      this.logger.log(`Connection State: ${this.getMongoConnectionState()}`);
    });

    // Log initial connection attempt
    this.logger.log('Attempting MongoDB connection...');
    this.logger.log(`Target: ${this.maskConnectionString(mongoUrl)}`);
  }

  private setupRedisLogging() {
    const redisConfig = this.configService.get('redis');
    const redisUrl = this.configService.get('REDIS_URL');
    
    this.redis = new Redis(redisConfig);

    this.redis.on('connect', () => {
      this.logger.log('Redis Connecting...');
      this.logger.log(`Target: ${this.maskConnectionString(redisUrl)}`);
    });

    this.redis.on('ready', () => {
      this.logger.log('Redis Connected Successfully');
      this.logger.log(` Host: ${redisConfig.host}:${redisConfig.port}`);
      this.logger.log(`Connection State: Ready`);
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis Connection Error:', error.message);
      this.logger.error(`Connection State: Error`);
    });

    this.redis.on('close', () => {
      this.logger.warn('Redis Connection Closed');
      this.logger.warn(`Connection State: Closed`);
    });

    this.redis.on('reconnecting', (ms) => {
      this.logger.log(`Redis Reconnecting in ${ms}ms...`);
    });

    // Test connection
    this.testRedisConnection();
  }

  private async testRedisConnection() {
    try {
      await this.redis.ping();
      this.logger.log('Redis Ping Test: SUCCESS');
    } catch (error) {
      this.logger.error('Redis Ping Test: FAILED', error.message);
    }
  }

  private setupKafkaLogging() {
    const kafkaConfig = this.configService.get('kafka');
    
    this.kafka = new Kafka({
      clientId: kafkaConfig.clientId,
      brokers: kafkaConfig.brokers,
    });

    // Test Kafka connection
    this.testKafkaConnection();
  }

  private async testKafkaConnection() {
    try {
      this.logger.log('Testing Kafka connection...');
      const kafkaConfig = this.configService.get('kafka');
      this.logger.log(`Brokers: ${kafkaConfig.brokers.join(', ')}`);
      
      const admin = this.kafka.admin();
      await admin.connect();
      
      const metadata = await admin.describeCluster();
      this.logger.log('Kafka Connected Successfully');
      this.logger.log(`Cluster ID: ${metadata.clusterId}`);
      this.logger.log(`Brokers Count: ${metadata.brokers.length}`);
      this.logger.log(`Connection State: Connected`);
      
      await admin.disconnect();
    } catch (error) {
      this.logger.error('Kafka Connection Error:', error.message);
      this.logger.error(`Connection State: Failed`);
      
      // If cloud Kafka fails, suggest local fallback
      if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
        this.logger.warn('Consider using local Kafka with: docker-compose --profile local-kafka up');
      }
    }
  }

  private getMongoConnectionState(): string {
    const states = {
      0: 'Disconnected',
      1: 'Connected',
      2: 'Connecting',
      3: 'Disconnecting',
      99: 'Uninitialized',
    };
    return states[this.mongoConnection.readyState] || 'Unknown';
  }

  private maskConnectionString(connectionString: string): string {
    if (!connectionString) return 'Not provided';
    
    // Mask passwords in connection strings
    return connectionString
      .replace(/:([^@]+)@/g, ':****@')  // MongoDB password
      .replace(/\/\/([^:]+):([^@]+)@/g, '//$1:****@'); // Redis password
  }

  // Health check methods
  async getConnectionHealth() {
    const health = {
      mongodb: {
        status: this.getMongoConnectionState(),
        connected: this.mongoConnection.readyState === 1,
      },
      redis: {
        status: 'Unknown',
        connected: false,
      },
      kafka: {
        status: 'Unknown',
        connected: false,
      },
    };

    // Check Redis
    if (this.redis) {
      try {
        await this.redis.ping();
        health.redis.status = 'Connected';
        health.redis.connected = true;
      } catch {
        health.redis.status = 'Error';
        health.redis.connected = false;
      }
    }

    // Check Kafka
    if (this.kafka) {
      try {
        const admin = this.kafka.admin();
        await admin.connect();
        await admin.describeCluster();
        await admin.disconnect();
        health.kafka.status = 'Connected';
        health.kafka.connected = true;
      } catch {
        health.kafka.status = 'Error';
        health.kafka.connected = false;
      }
    }

    return health;
  }
}