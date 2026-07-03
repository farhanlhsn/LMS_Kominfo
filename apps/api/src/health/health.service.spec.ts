import { describe, expect, it } from "vitest";
import { HealthService } from "./health.service";

describe("HealthService", () => {
  it("returns a foundation health payload", () => {
    process.env.DATABASE_URL = "postgresql://example";
    process.env.REDIS_URL = "redis://example";
    process.env.S3_ENDPOINT = "http://example";

    const health = new HealthService().getHealth();

    expect(health.status).toBe("ok");
    expect(health.service).toBe("api");
    expect(health.dependencies.database).toBe("configured");
    expect(health.dependencies.redis).toBe("configured");
    expect(health.dependencies.storage).toBe("configured");
  });
});
