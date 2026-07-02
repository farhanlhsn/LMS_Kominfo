import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '@/prisma/prisma.service';
import { CacheService } from '@/common/cache/cache.service';
import { StorageService } from '@/common/storage/storage.service';
import { ConfigService } from '@nestjs/config';

interface ComponentStatus {
  name: string;
  status: 'up' | 'down' | 'degraded' | 'disabled';
  latencyMs?: number;
  message?: string;
  details?: Record<string, unknown>;
}

interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  timestamp: string;
  uptime: number;
  components: ComponentStatus[];
}

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Health check publik — lightweight, hanya status aplikasi.
   * Cocok untuk load balancer / Kubernetes liveness probe.
   */
  @Get()
  @ApiOperation({ summary: 'Health check publik (liveness)' })
  liveness() {
    return {
      status: 'ok',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * Readiness check — verifikasi semua dependency (DB, Redis, MinIO, OpenAI).
   * Cocok untuk Kubernetes readiness probe & monitoring alert.
   * Mengembalikan HTTP 503 jika ada komponen critical yang down.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness check (verifikasi DB, Redis, MinIO, OpenAI)' })
  async readiness(): Promise<HealthResponse> {
    const components: ComponentStatus[] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkStorage(),
      this.checkOpenAI(),
    ]);

    const criticalDown = components.some(
      (c) => c.status === 'down' && (c.name === 'database' || c.name === 'redis'),
    );

    const overall: HealthResponse['status'] = criticalDown
      ? 'down'
      : components.some((c) => c.status === 'down' || c.status === 'degraded')
        ? 'degraded'
        : 'ok';

    const response: HealthResponse = {
      status: overall,
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
      components,
    };

    if (overall === 'down') {
      throw new HttpException(response, HttpStatus.SERVICE_UNAVAILABLE);
    }
    return response;
  }

  private async checkDatabase(): Promise<ComponentStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        name: 'database',
        status: 'up',
        latencyMs: Date.now() - start,
        details: { provider: 'postgresql' },
      };
    } catch (err) {
      return {
        name: 'database',
        status: 'down',
        latencyMs: Date.now() - start,
        message: (err as Error).message,
      };
    }
  }

  private async checkRedis(): Promise<ComponentStatus> {
    if (!this.cache.isAvailable()) {
      return { name: 'redis', status: 'down', message: 'Redis not connected' };
    }
    const start = Date.now();
    try {
      const ok = await this.cache.ping();
      return {
        name: 'redis',
        status: ok ? 'up' : 'down',
        latencyMs: Date.now() - start,
        details: { role: 'cache' },
      };
    } catch (err) {
      return {
        name: 'redis',
        status: 'down',
        latencyMs: Date.now() - start,
        message: (err as Error).message,
      };
    }
  }

  private async checkStorage(): Promise<ComponentStatus> {
    const start = Date.now();
    try {
      const provider = this.storage.getProvider();
      const ok = await this.storage.ping();
      return {
        name: 'storage',
        status: ok ? 'up' : 'down',
        latencyMs: Date.now() - start,
        details: { provider },
      };
    } catch (err) {
      return {
        name: 'storage',
        status: 'degraded',
        latencyMs: Date.now() - start,
        message: (err as Error).message,
      };
    }
  }

  private async checkOpenAI(): Promise<ComponentStatus> {
    if (!this.config.get<string>('OPENAI_API_KEY')) {
      return { name: 'openai', status: 'disabled', message: 'OPENAI_API_KEY not set' };
    }
    const start = Date.now();
    try {
      // Simple reachability check: HEAD request ke API OpenAI
      const res = await fetch('https://api.openai.com/v1/models', {
        method: 'GET',
        headers: { Authorization: `Bearer ${this.config.get<string>('OPENAI_API_KEY')}` },
        signal: AbortSignal.timeout(5000),
      });
      return {
        name: 'openai',
        status: res.ok ? 'up' : 'degraded',
        latencyMs: Date.now() - start,
        details: { statusCode: res.status },
      };
    } catch (err) {
      return {
        name: 'openai',
        status: 'down',
        latencyMs: Date.now() - start,
        message: (err as Error).message,
      };
    }
  }
}
