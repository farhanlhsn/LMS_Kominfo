import { describe, expect, it, vi } from "vitest";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns ok when deps respond", async () => {
    process.env.DATABASE_URL = "postgresql://example";
    process.env.REDIS_URL = "redis://example";
    process.env.S3_ENDPOINT = "http://example";

    const prisma = { $queryRaw: vi.fn().mockResolvedValue([{ "?column?": 1 }]) };
    const redis = {
      getClient: () => ({
        status: "ready",
        ping: vi.fn().mockResolvedValue("PONG"),
        connect: vi.fn(),
      }),
    };

    const health = await new HealthService(prisma as never, redis as never).getHealth();

    expect(health.status).toBe("ok");
    expect(health.service).toBe("api");
    expect(health.dependencies.database).toBe("ok");
    expect(health.dependencies.redis).toBe("ok");
    expect(health.dependencies.storage).toBe("configured");
  });

  it("marks error when database probe fails", async () => {
    process.env.DATABASE_URL = "postgresql://example";
    process.env.REDIS_URL = "redis://example";
    process.env.S3_ENDPOINT = "http://example";

    const prisma = {
      $queryRaw: vi.fn().mockRejectedValue(new Error("down")),
    };
    const redis = {
      getClient: () => ({
        status: "ready",
        ping: vi.fn().mockResolvedValue("PONG"),
        connect: vi.fn(),
      }),
    };

    const health = await new HealthService(prisma as never, redis as never).getHealth();
    expect(health.status).toBe("error");
    expect(health.dependencies.database).toBe("error");
  });
});
