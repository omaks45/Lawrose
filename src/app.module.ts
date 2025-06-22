/* eslint-disable prettier/prettier */
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConnectionModule } from './common/connections/connections.module';

import databaseConfig from './config/database.config';
import kafkaConfig from './config/kafka.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import emailConfig from './config/email.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig, kafkaConfig, redisConfig, jwtConfig, emailConfig],
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGO_URL),
    ConnectionModule, //
    // ... other modules
  ],
})
export class AppModule {}
