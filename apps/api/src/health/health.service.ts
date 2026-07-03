import { Injectable } from "@nestjs/common";

export interface HealthStatus {
  status: "ok";
  service: "api";
  timestamp: string;
  dependencies: {
    database: "configured" | "missing";
    redis: "configured" | "missing";
    storage: "configured" | "missing";
  };
}

@Injectable()
export class HealthService {
  getHealth(): HealthStatus {
    return {
      status: "ok",
      service: "api",
      timestamp: new Date().toISOString(),
      dependencies: {
        database: process.env.DATABASE_URL ? "configured" : "missing",
        redis: process.env.REDIS_URL ? "configured" : "missing",
        storage: process.env.S3_ENDPOINT ? "configured" : "missing"
      }
    };
  }
}
