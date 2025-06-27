/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  try {
    // Create the main NestJS application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Security middleware
    app.use(helmet());
    app.use(compression());

    // Enable CORS for cross-origin requests
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
      credentials: true,
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    // Swagger documentation (only in development)
    if (process.env.NODE_ENV !== 'production') {
      const config = new DocumentBuilder()
        .setTitle('Lawrose User Service API')
        .setDescription('User management microservice for Lawrose platform')
        .setVersion('1.0')
        .addBearerAuth(
          {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            name: 'JWT',
            description: 'Enter JWT token',
            in: 'header',
          },
          'JWT-auth',
        )
        .addTag('Authentication', 'User authentication and verification')
        .addTag('Users', 'User management operations')
        .addTag('Addresses', 'Address management')
        .addTag('Shipping', 'Shipping rate calculations')
        .build();

      const document = SwaggerModule.createDocument(app, config);
      SwaggerModule.setup('api/docs', app, document, {
        swaggerOptions: {
          persistAuthorization: true,
        },
      });

      logger.log(`Swagger documentation available at: http://localhost:${process.env.PORT}/api/docs`);
    }

    // Connect Kafka microservice
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID || 'LawUser',
          brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
          ssl: process.env.KAFKA_SSL === 'true' ? true : false,
          connectionTimeout: 45000,
          requestTimeout: 30000,
          retry: {
            retries: 8,
            initialRetryTime: 300,
            maxRetryTime: 30000,
          },
        },
        consumer: {
          groupId: process.env.KAFKA_GROUP_ID || 'LawUser-group',
          heartbeatInterval: 3000,
          sessionTimeout: 30000,
          rebalanceTimeout: 60000,
          allowAutoTopicCreation: true,
        },
        producer: {
          maxInFlightRequests: 1,
          idempotent: true,
          transactionTimeout: 30000,
          retry: {
            retries: 5,
            initialRetryTime: 100,
            maxRetryTime: 5000,
          },
        },
        subscribe: {
          fromBeginning: false,
        },
      },
    });

    // Health check endpoint
    app.use('/health', (req, res) => {
      res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'user-service',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV,
      });
    });

    // Global exception filter for better error handling
    // app.useGlobalFilters(new AllExceptionsFilter());

    // Start all microservices
    await app.startAllMicroservices();
    logger.log('Kafka microservice started successfully');

    // Start HTTP server
    const port = process.env.PORT || 5000;
    await app.listen(port);

    logger.log(`User Service running on port ${port}`);
    logger.log(`Environment: ${process.env.NODE_ENV}`);
    logger.log(`Kafka Brokers: ${process.env.KAFKA_BROKERS}`);
    logger.log(`Kafka Group ID: ${process.env.KAFKA_GROUP_ID}`);
    
    if (process.env.LOG_KAFKA_CONNECTION === 'true') {
      logger.log('🔗 Kafka connection logging enabled');
    }

  } catch (error) {
    logger.error('Failed to start User Service:', error);
    process.exit(1);
  }

  // Graceful shutdown handling
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM received, shutting down gracefully...');
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    logger.log('SIGINT received, shutting down gracefully...');
    process.exit(0);
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    process.exit(1);
  });
}

bootstrap();