import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import {
  assertRateLimitEnvSafe,
  RateLimitMiddleware,
} from "./rate-limit.middleware";

function makeReq(
  ip: string,
  headers: Record<string, string> = {},
  path = "/api/v1/courses",
): Request {
  return {
    ip,
    headers: { "x-forwarded-for": "", ...headers },
    originalUrl: path,
    url: path,
  } as unknown as Request;
}

function makeRes(): Response {
  const res: any = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function makeNext() {
  return vi.fn() as unknown as NextFunction;
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("RateLimitMiddleware", () => {
  it("refuses DISABLE_RATE_LIMIT in production at construct/boot", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.DISABLE_RATE_LIMIT;
    process.env.NODE_ENV = "production";
    process.env.DISABLE_RATE_LIMIT = "true";
    try {
      expect(() => assertRateLimitEnvSafe()).toThrow(
        /not allowed when NODE_ENV=production/,
      );
      expect(
        () => new RateLimitMiddleware({ windowMs: 1000, max: 5 }),
      ).toThrow(/not allowed when NODE_ENV=production/);
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevFlag === undefined) delete process.env.DISABLE_RATE_LIMIT;
      else process.env.DISABLE_RATE_LIMIT = prevFlag;
    }
  });

  it("allows DISABLE_RATE_LIMIT outside production", () => {
    const prevEnv = process.env.NODE_ENV;
    const prevFlag = process.env.DISABLE_RATE_LIMIT;
    process.env.NODE_ENV = "development";
    process.env.DISABLE_RATE_LIMIT = "true";
    try {
      expect(() => assertRateLimitEnvSafe()).not.toThrow();
      const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 5 });
      const next = makeNext();
      middleware.use(makeReq("8.8.8.8"), makeRes(), next);
      expect(next).toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = prevEnv;
      if (prevFlag === undefined) delete process.env.DISABLE_RATE_LIMIT;
      else process.env.DISABLE_RATE_LIMIT = prevFlag;
    }
  });

  it("lets requests through under the limit", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 5 });
    const next = makeNext();
    for (let i = 0; i < 5; i++) {
      middleware.use(makeReq("1.1.1.1"), makeRes(), next);
    }
    await flush();
    expect(next).toHaveBeenCalledTimes(5);
  });

  it("blocks requests over the limit and sets 429", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 2 });
    const next = makeNext();
    const req = makeReq("2.2.2.2");
    const res = makeRes();
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: "RATE_LIMITED" }),
      }),
    );
  });

  it("uses X-Forwarded-For for keying when present", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 1 });
    const next = makeNext();
    const req = makeReq("0.0.0.0", { "x-forwarded-for": "9.9.9.9, 1.1.1.1" });
    const res = makeRes();
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("resets after the window", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 20, max: 1 });
    const next = makeNext();
    const req = makeReq("3.3.3.3");
    const res = makeRes();
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(429);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const res2 = makeRes();
    middleware.use(req, res2, next);
    await flush();
    expect(res2.status).not.toHaveBeenCalled();
  });

  it("sets X-RateLimit-* headers on each request", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 10 });
    const next = makeNext();
    const res = makeRes();
    middleware.use(makeReq("4.4.4.4"), res, next);
    await flush();
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
  });

  it("applies a stricter limit on auth login path", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 100 });
    const next = makeNext();
    const req = makeReq("5.5.5.5", {}, "/api/v1/auth/login");
    for (let i = 0; i < 20; i++) {
      middleware.use(req, makeRes(), next);
    }
    await flush();
    const res = makeRes();
    middleware.use(req, res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("uses redis incr when redis is ready", async () => {
    let n = 0;
    const redis = {
      incrWithTtl: vi.fn(async () => {
        n += 1;
        return { count: n, ttlMs: 1000 };
      }),
    };
    const middleware = new RateLimitMiddleware(
      { windowMs: 1000, max: 2 },
      redis as never,
    );
    const next = makeNext();
    const res = makeRes();
    middleware.use(makeReq("6.6.6.6"), res, next);
    middleware.use(makeReq("6.6.6.6"), res, next);
    middleware.use(makeReq("6.6.6.6"), res, next);
    await flush();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(n).toBeGreaterThanOrEqual(3);
  });
});

