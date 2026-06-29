import { Test, TestingModule } from '@nestjs/testing';
import { HealthService } from './health.service';
import { DataSource } from 'typeorm';
import { SorobanRpcService } from '../common/services/soroban-rpc.service';

describe('HealthService', () => {
  let service: HealthService;

  const mockDataSource = { query: jest.fn() };
  const mockSorobanRpcService = {
    checkConnectivity: jest.fn(),
    checkKnownContract: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: DataSource, useValue: mockDataSource },
        { provide: SorobanRpcService, useValue: mockSorobanRpcService },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHealth', () => {
    it('returns status ok with timestamp', () => {
      const result = service.getHealth();
      expect(result.status).toBe('ok');
      expect(typeof result.timestamp).toBe('string');
      expect(new Date(result.timestamp).toISOString()).toBe(result.timestamp);
    });
  });

  describe('checkDatabase', () => {
    it('returns up when query succeeds', async () => {
      mockDataSource.query.mockResolvedValue([1]);
      const result = await service.checkDatabase();
      expect(result).toEqual({ status: 'up' });
    });

    it('returns down with error message when query fails', async () => {
      mockDataSource.query.mockRejectedValue(new Error('Connection refused'));
      const result = await service.checkDatabase();
      expect(result.status).toBe('down');
      expect(result.error).toBe('Connection refused');
    });
  });

  describe('checkRedis', () => {
    it('returns down with not configured message', async () => {
      const result = await service.checkRedis();
      expect(result.status).toBe('down');
      expect(result.message).toBe('Redis not configured');
    });
  });

  describe('checkSorobanRpc', () => {
    it('delegates to sorobanRpcService.checkConnectivity', async () => {
      const expected = { status: 'up' as const };
      mockSorobanRpcService.checkConnectivity.mockResolvedValue(expected);
      const result = await service.checkSorobanRpc();
      expect(result).toBe(expected);
      expect(mockSorobanRpcService.checkConnectivity).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkSorobanContract', () => {
    it('delegates to sorobanRpcService.checkKnownContract', async () => {
      const expected = { status: 'up' as const };
      mockSorobanRpcService.checkKnownContract.mockResolvedValue(expected);
      const result = await service.checkSorobanContract();
      expect(result).toBe(expected);
      expect(mockSorobanRpcService.checkKnownContract).toHaveBeenCalledTimes(1);
    });
  });

  describe('getHealthChecks', () => {
    it('returns all checks on first page with default limit', () => {
      const result = service.getHealthChecks(1, 20);
      expect(result.total).toBe(5);
      expect(result.data).toHaveLength(5);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('paginates results correctly', () => {
      const result = service.getHealthChecks(1, 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('app');
      expect(result.data[1].name).toBe('db');
      expect(result.total).toBe(5);
    });

    it('returns second page correctly', () => {
      const result = service.getHealthChecks(2, 2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('redis');
    });

    it('returns empty data beyond last page', () => {
      const result = service.getHealthChecks(10, 20);
      expect(result.data).toHaveLength(0);
    });

    it('each check has name and endpoint', () => {
      const { data } = service.getHealthChecks(1, 20);
      for (const check of data) {
        expect(check.name).toBeDefined();
        expect(check.endpoint).toBeDefined();
      }
    });
  });
});
