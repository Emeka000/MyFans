import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SorobanRpcService, SorobanHealthStatus } from '../common/services/soroban-rpc.service';

@Injectable()
export class HealthService {
  constructor(
    private dataSource: DataSource,
    private sorobanRpcService: SorobanRpcService
  ) {}

  getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  async checkDatabase() {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'up' };
    } catch (error) {
      return { status: 'down', error: error instanceof Error ? error.message : String(error) };
    }
  }

  async checkRedis() {
    // Redis is not configured in this project folder yet.
    // Returning 'not_configured' as a placeholder.
    return { status: 'down', message: 'Redis not configured' };
  }

  async checkSorobanRpc(): Promise<SorobanHealthStatus> {
    return this.sorobanRpcService.checkConnectivity();
  }

  async checkSorobanContract(): Promise<SorobanHealthStatus> {
    return this.sorobanRpcService.checkKnownContract();
  }

  private readonly HEALTH_CHECKS = [
    { name: 'app', endpoint: '/health' },
    { name: 'db', endpoint: '/health/db' },
    { name: 'redis', endpoint: '/health/redis' },
    { name: 'soroban', endpoint: '/health/soroban' },
    { name: 'soroban-contract', endpoint: '/health/soroban-contract' },
  ];

  getHealthChecks(page = 1, limit = 20) {
    const start = (page - 1) * limit;
    const data = this.HEALTH_CHECKS.slice(start, start + limit);
    return { data, total: this.HEALTH_CHECKS.length, page, limit };
  }
}
