import { Inject, Injectable, Optional } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  service: "api";
  version: string;
  timestamp: string;
  uptime: number;
  memory: { used: number; total: number; percent: number };
  dependencies: {
    database: "ok" | "missing" | "error" | "configured";
    redis: "ok" | "missing" | "error" | "configured";
    storage: "configured" | "missing";
  };
  meta: {
    nodeVersion: string;
    platform: string;
    cpuCores: number;
  };
}

@Injectable()
export class HealthService {
  private startTime = Date.now();

  constructor(
    @Optional() @Inject(PrismaService) private readonly prisma?: PrismaService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  async getHealth(): Promise<HealthStatus> {
    const mem = process.memoryUsage();
    const usedMem = Math.round(mem.heapUsed / 1024 / 1024);
    const totalMem = Math.round(mem.heapTotal / 1024 / 1024);

    const [database, redis] = await Promise.all([
      this.checkDatabase(),
      this.checkRedis(),
    ]);
    const storage = process.env.S3_ENDPOINT ? "configured" : "missing";

    const deps = { database, redis, storage } as HealthStatus["dependencies"];
    const hardFail = database === "error" || database === "missing";
    const softFail =
      redis === "error" ||
      redis === "missing" ||
      storage === "missing";

    return {
      status: hardFail ? "error" : softFail ? "degraded" : "ok",
      service: "api",
      version: process.env.npm_package_version || "0.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memory: {
        used: usedMem,
        total: totalMem,
        percent: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0,
      },
      dependencies: deps,
      meta: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuCores: require("os").cpus().length,
      },
    };
  }

  private async checkDatabase(): Promise<HealthStatus["dependencies"]["database"]> {
    if (!process.env.DATABASE_URL) return "missing";
    if (!this.prisma) return "configured";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<HealthStatus["dependencies"]["redis"]> {
    if (!process.env.REDIS_URL) return "missing";
    if (!this.redis) return "configured";
    try {
      const client = this.redis.getClient();
      if (client.status === "wait") {
        await client.connect().catch(() => undefined);
      }
      const pong = await client.ping();
      return pong === "PONG" ? "ok" : "error";
    } catch {
      return "error";
    }
  }
}
