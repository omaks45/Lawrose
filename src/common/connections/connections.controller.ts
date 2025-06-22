/* eslint-disable prettier/prettier */
import { Controller, Get } from '@nestjs/common';
import { ConnectionService } from './connections.service';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(
    private readonly connectionService: ConnectionService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  async getHealth() {
    const connections = await this.connectionService.getConnectionHealth();
    const timestamp = new Date().toISOString();
    const environment = this.configService.get('NODE_ENV');

    return {
      status: 'ok',
      timestamp,
      environment,
      service: 'lawrose-user-service',
      version: process.env.npm_package_version || '1.0.0',
      connections,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }

  @Get('connections')
  async getConnectionDetails() {
    return await this.connectionService.getConnectionHealth();
  }

  @Get('live')
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  async getReadiness() {
    const connections = await this.connectionService.getConnectionHealth();
    const allConnected = Object.values(connections).every(conn => conn.connected);

    return {
      status: allConnected ? 'ready' : 'not ready',
      timestamp: new Date().toISOString(),
      connections,
    };
  }
}