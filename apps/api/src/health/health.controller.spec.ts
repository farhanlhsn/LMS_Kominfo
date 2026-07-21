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

  it("returns liveness and metrics for non-production clients", async () => {
    const live = await request(app.getHttpServer())
      .get("/api/v1/health/live")
      .expect(200);
    expect(live.body.data ?? live.body).toMatchObject({
      status: "ok",
      service: "api",
    });

    const metrics = await request(app.getHttpServer())
      .get("/api/v1/health/metrics")
      .expect(200);
    expect(metrics.body.data ?? metrics.body).toBeTruthy();
  });

  it("allows metrics with matching METRICS_TOKEN header", async () => {
    const prev = process.env.METRICS_TOKEN;
    process.env.METRICS_TOKEN = "secret-token";
    const metrics = await request(app.getHttpServer())
      .get("/api/v1/health/metrics")
      .set("x-metrics-token", "secret-token")
      .expect(200);
    expect(metrics.body.data ?? metrics.body).toBeTruthy();
    if (prev === undefined) delete process.env.METRICS_TOKEN;
    else process.env.METRICS_TOKEN = prev;
  });
});

describe("isPrivateOrLocalIp via HealthController metrics gate", () => {
  it("allows private IPs and forbids public IP in production without token", async () => {
    const { HealthController } = await import("./health.controller");
    const healthService = { getHealth: vi.fn() };
    const controller = new HealthController(healthService as never);
    const prevEnv = process.env.NODE_ENV;
    const prevToken = process.env.METRICS_TOKEN;
    delete process.env.METRICS_TOKEN;
    process.env.NODE_ENV = "production";

    const privateReq = {
      headers: { "x-forwarded-for": "10.0.0.5, 1.2.3.4" },
      ip: undefined,
      socket: {},
    } as any;
    expect(controller.getMetrics(privateReq)).toEqual(
      expect.objectContaining({ data: expect.anything() }),
    );

    for (const ip of ["127.0.0.1", "::1", "192.168.1.1", "172.16.0.1", "172.31.0.1"]) {
      expect(
        controller.getMetrics({
          headers: {},
          ip,
          socket: {},
        } as any),
      ).toEqual(expect.objectContaining({ data: expect.anything() }));
    }
    expect(
      controller.getMetrics({
        headers: {},
        ip: undefined,
        socket: { remoteAddress: "10.2.3.4" },
      } as any),
    ).toEqual(expect.objectContaining({ data: expect.anything() }));

    expect(() =>
      controller.getMetrics({
        headers: {},
        ip: "8.8.8.8",
        socket: { remoteAddress: "8.8.8.8" },
      } as any),
    ).toThrow(/restricted/i);

    process.env.NODE_ENV = prevEnv;
    if (prevToken === undefined) delete process.env.METRICS_TOKEN;
    else process.env.METRICS_TOKEN = prevToken;
  });
});
