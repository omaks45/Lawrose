/* eslint-disable prettier/prettier */
// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ConnectionModule } from './common/connections/connections.module';
import { AuthModule } from './modules/auth/auth.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { AddressesModule } from './modules/addresses/addresses.module';

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
    ConnectionModule,
    AuthModule,
    ShippingModule,
    AddressesModule,
  ],
})
export class AppModule {}
