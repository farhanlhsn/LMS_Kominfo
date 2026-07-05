import { describe, expect, it, vi } from "vitest";
import type { NextFunction, Request, Response } from "express";
import { RateLimitMiddleware } from "./rate-limit.middleware";

function makeReq(ip: string, headers: Record<string, string> = {}): Request {
  return {
    ip,
    headers: { "x-forwarded-for": "", ...headers },
  } as unknown as Request;
}

function makeRes(): Response {
  const headers: Record<string, string | number> = {};
  const res: any = {
    setHeader: vi.fn((k: string, v: string | number) => {
      headers[k] = v;
    }),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as Response;
}

function makeNext() {
  return vi.fn() as unknown as NextFunction;
}

describe("RateLimitMiddleware", () => {
  it("lets requests through under the limit", () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 5 });
    const next = makeNext();
    for (let i = 0; i < 5; i++) {
      middleware.use(makeReq("1.1.1.1"), makeRes(), next);
    }
    expect(next).toHaveBeenCalledTimes(5);
  });

  it("blocks requests over the limit and sets 429", () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 2 });
    const next = makeNext();
    const req = makeReq("2.2.2.2");
    const res = makeRes();
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, error: expect.objectContaining({ code: "RATE_LIMITED" }) }),
    );
  });

  it("uses X-Forwarded-For for keying when present", () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 1 });
    const next = makeNext();
    const req = makeReq("0.0.0.0", { "x-forwarded-for": "9.9.9.9, 1.1.1.1" });
    const res = makeRes();
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("resets after the window", async () => {
    const middleware = new RateLimitMiddleware({ windowMs: 20, max: 1 });
    const next = makeNext();
    const req = makeReq("3.3.3.3");
    const res = makeRes();
    middleware.use(req, res, next);
    middleware.use(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    await new Promise((resolve) => setTimeout(resolve, 30));
    const res2 = makeRes();
    middleware.use(req, res2, next);
    expect(res2.status).not.toHaveBeenCalled();
  });

  it("sets X-RateLimit-* headers on each request", () => {
    const middleware = new RateLimitMiddleware({ windowMs: 1000, max: 10 });
    const next = makeNext();
    const res = makeRes();
    middleware.use(makeReq("4.4.4.4"), res, next);
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Limit", "10");
    expect(res.setHeader).toHaveBeenCalledWith("X-RateLimit-Remaining", "9");
  });
});
