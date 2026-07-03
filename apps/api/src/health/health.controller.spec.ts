import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import { AppModule } from "../app.module";
import { HttpExceptionFilter } from "../common/filters/http-exception.filter";
import { ResponseInterceptor } from "../common/interceptors/response.interceptor";

describe("HealthController", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.SKIP_DATABASE_CONNECT = "true";
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule]
    }).compile();

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
