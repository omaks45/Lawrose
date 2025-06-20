/* eslint-disable prettier/prettier */
// src/common/connection/connection.module.ts
import { Module } from '@nestjs/common';
import { ConnectionService } from './connection.service';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [MongooseModule], // Needed to use @InjectConnection
  providers: [ConnectionService],
  exports: [ConnectionService],
})
export class ConnectionModule {}
