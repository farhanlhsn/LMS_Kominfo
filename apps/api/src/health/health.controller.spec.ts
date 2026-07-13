import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it, vi } from "vitest";
import { AppModule } from "../app.module";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../redis/redis.constants";
import { HttpExceptionFilter } from "../common/filters/http-exception.filter";
import { ResponseInterceptor } from "../common/interceptors/response.interceptor";

function createMockRedis() {
  const sub = {
    status: "ready",
    connect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
  return {
    status: "ready",
    ping: vi.fn().mockResolvedValue("PONG"),
    duplicate: vi.fn().mockReturnValue(sub),
    connect: vi.fn().mockResolvedValue(undefined),
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
  };
}

describe("HealthController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SKIP_DATABASE_CONNECT = "true";
    process.env.S3_ENDPOINT = "https://minio.local";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    })
      .overrideProvider(PrismaService)
      .useValue({ $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }]) } as never)
      .overrideProvider(REDIS_CLIENT)
      .useValue(createMockRedis() as never)
      .compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalInterceptors(new ResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.SKIP_DATABASE_CONNECT;
  });

  it("wraps health responses in the standard API format", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);

    expect(response.body.success).toBe(true);
    expect(response.body.data.status).toBe("ok");
    expect(response.body.data.service).toBe("api");
  });
});
