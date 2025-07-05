/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from './app.module';
import * as compression from 'compression';
import helmet from 'helmet';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    const httpPort = process.env.PORT || 5000;
    // Create the HTTP application
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });
    
    // Security middleware - Configure helmet to allow Swagger
    app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    }));
    app.use(compression());
    
    // Global configuration
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }));
    
    // CORS configuration
    app.enableCors({
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5000', 'http://localhost:3001'],
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
      credentials: true,
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

    // Swagger Configuration - Enable based on ENABLE_SWAGGER environment variable
    if (process.env.ENABLE_SWAGGER !== 'false') {
      const config = new DocumentBuilder()
      .setTitle('Lawrose User Service API')
      .setDescription(`
        User Service API provides comprehensive user management functionality.
        
        ## Features
        - User CRUD operations
        - Address management
        - Email verification
        - Bulk operations
        - Advanced search and filtering
        
        ## Development vs Production
        - **Development**: Access via HTTP REST endpoints (this documentation)
        - **Production**: Communication via Kafka message patterns
        
        ## Authentication
        Most endpoints require authentication in production. For development testing, 
        authentication can be disabled via environment variables.
      `)
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
        tagsSorter: 'alpha',
        operationsSorter: 'method',
        docExpansion: 'none',
        filter: true,
        showRequestHeaders: true,
      },
      customSiteTitle: 'Lawrose User Service API',
    });
      logger.log(`Swagger documentation available at: http://localhost:${httpPort}/api/docs`);
    } else {
      logger.log('Swagger documentation is disabled (ENABLE_SWAGGER=false)');
    }

    // Configure and start Kafka microservice
    if (process.env.ENABLE_KAFKA !== 'false') {
      const kafkaOptions: MicroserviceOptions = {
        transport: Transport.KAFKA,
        options: {
          client: {
            clientId: process.env.KAFKA_CLIENT_ID || 'LawUser',
            brokers: (process.env.KAFKA_BROKERS || 'kafka:9092').split(','),
            ssl: process.env.KAFKA_SSL === 'true' ? {
              rejectUnauthorized: false,
            } : false,
            sasl: process.env.KAFKA_USERNAME ? {
              mechanism: 'plain',
              username: process.env.KAFKA_USERNAME,
              password: process.env.KAFKA_PASSWORD,
            } : undefined,
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
            retry: {
              retries: 3,
            },
          },
          producer: {
            maxInFlightRequests: 1,
            idempotent: true,
            transactionTimeout: 30000,
            allowAutoTopicCreation: true,
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
      };

      app.connectMicroservice(kafkaOptions);
      await app.startAllMicroservices();
      logger.log('Kafka microservice started successfully');
      
      if (process.env.LOG_KAFKA_CONNECTION === 'true') {
        logger.log('🔗 Kafka connection logging enabled');
        logger.log(`Kafka Brokers: ${process.env.KAFKA_BROKERS}`);
        logger.log(`Kafka Group ID: ${process.env.KAFKA_GROUP_ID}`);
      }
    }

    // Start HTTP server - Use PORT from environment (matches docker-compose)
    await app.listen(httpPort);
    
    logger.log(`User Service running on port ${httpPort}`);
    logger.log(`Environment: ${process.env.NODE_ENV}`);
    logger.log(`Swagger docs: http://localhost:${httpPort}/api/docs`);

  } catch (error) {
    logger.error('Failed to start User Service:', error);
    process.exit(1);
  }
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

bootstrap().catch((error) => {
  logger.error('Error starting application', error);
  process.exit(1);
});