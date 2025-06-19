/* eslint-disable prettier/prettier */
import { ConfigModule } from '@nestjs/config';
import databaseConfig from './config/database.config';
import kafkaConfig from './config/kafka.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import emailConfig from './config/email.config';
import { Module } from '@nestjs/common';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, kafkaConfig, redisConfig, jwtConfig, emailConfig],
      isGlobal: true,
    }),
    // ... other modules
  ],
})
export class AppModule {}