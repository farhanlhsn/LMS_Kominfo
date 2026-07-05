import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  status: "ok" | "degraded" | "error";
  service: "api";
  version: string;
  timestamp: string;
  uptime: number;
  memory: { used: number; total: number; percent: number };
  dependencies: {
    database: "configured" | "missing" | "error";
    redis: "configured" | "missing" | "error";
    storage: "configured" | "missing" | "error";
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

  getHealth(): HealthStatus {
    const mem = process.memoryUsage();
    const usedMem = Math.round(mem.heapUsed / 1024 / 1024);
    const totalMem = Math.round(mem.heapTotal / 1024 / 1024);

    return {
      status: "ok",
      service: "api",
      version: process.env.npm_package_version || "0.0.0",
      timestamp: new Date().toISOString(),
      uptime: Math.round((Date.now() - this.startTime) / 1000),
      memory: {
        used: usedMem,
        total: totalMem,
        percent: totalMem > 0 ? Math.round((usedMem / totalMem) * 100) : 0,
      },
      dependencies: {
        database: process.env.DATABASE_URL ? "configured" : "missing",
        redis: process.env.REDIS_URL ? "configured" : "missing",
        storage: process.env.S3_ENDPOINT ? "configured" : "missing",
      },
      meta: {
        nodeVersion: process.version,
        platform: process.platform,
        cpuCores: require("os").cpus().length,
      },
    };
  }
}
