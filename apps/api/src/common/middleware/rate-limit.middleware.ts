import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_MAX = 240; // 240 req/min/IP

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    private readonly options: {
      windowMs?: number;
      max?: number;
      keyExtractor?: (req: Request) => string;
    } = {},
  ) {}

  private getKey(req: Request) {
    if (this.options.keyExtractor) return this.options.keyExtractor(req);
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    }
    return req.ip ?? "unknown";
  }

  use(request: Request, response: Response, next: NextFunction) {
    const windowMs = this.options.windowMs ?? DEFAULT_WINDOW_MS;
    const max = this.options.max ?? DEFAULT_MAX;
    const key = this.getKey(request);
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
    }

    const current = this.buckets.get(key)!;
    response.setHeader("X-RateLimit-Limit", String(max));
    response.setHeader("X-RateLimit-Remaining", String(Math.max(0, max - current.count)));
    response.setHeader("X-RateLimit-Reset", String(Math.ceil(current.resetAt / 1000)));

    if (current.count > max) {
      response.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      });
      return;
    }

    // Periodic cleanup to prevent unbounded memory growth.
    if (this.buckets.size > 5000) {
      for (const [k, v] of this.buckets) {
        if (v.resetAt <= now) this.buckets.delete(k);
      }
    }
    next();
  }
}
