import { Inject, Injectable, NestMiddleware, Optional } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { RedisService } from "../../redis/redis.service";

interface RateLimitBucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyExtractor?: (req: Request) => string;
}

export const RATE_LIMIT_OPTIONS = Symbol("RATE_LIMIT_OPTIONS");

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 240;
const AUTH_MAX = 20;
const AUTH_PATH_RE =
  /^\/api\/v1\/auth\/(login|register|forgot-password|reset-password)\/?$/i;

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, RateLimitBucket>();

  constructor(
    @Optional()
    @Inject(RATE_LIMIT_OPTIONS)
    private readonly options: RateLimitOptions = {},
    @Optional() private readonly redis?: RedisService,
  ) {}

  private getKey(req: Request) {
    if (this.options.keyExtractor) return this.options.keyExtractor(req);
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string" && forwarded.length > 0) {
      return forwarded.split(",")[0]?.trim() ?? req.ip ?? "unknown";
    }
    return req.ip ?? "unknown";
  }

  private limitsFor(req: Request) {
    const windowMs = this.options.windowMs ?? DEFAULT_WINDOW_MS;
    const path = (req.originalUrl ?? req.url ?? "").split("?")[0] ?? "";
    const isAuth = AUTH_PATH_RE.test(path);
    const max = isAuth ? AUTH_MAX : (this.options.max ?? DEFAULT_MAX);
    const prefix = isAuth ? "auth" : "global";
    return { windowMs, max, prefix };
  }

  use(request: Request, response: Response, next: NextFunction) {
    void this.apply(request, response, next);
  }

  private async apply(
    request: Request,
    response: Response,
    next: NextFunction,
  ) {
    // E2E suites login many times from one IP (Playwright sets this on webServer).
    if (process.env.DISABLE_RATE_LIMIT === "true") {
      next();
      return;
    }

    const { windowMs, max, prefix } = this.limitsFor(request);
    const key = `${prefix}:${this.getKey(request)}`;

    const redisHit = await this.tryRedis(key, windowMs);
    const { count, resetAt } = redisHit ?? this.memoryHit(key, windowMs);

    response.setHeader("X-RateLimit-Limit", String(max));
    response.setHeader(
      "X-RateLimit-Remaining",
      String(Math.max(0, max - count)),
    );
    response.setHeader(
      "X-RateLimit-Reset",
      String(Math.ceil(resetAt / 1000)),
    );

    if (count > max) {
      response.status(429).json({
        success: false,
        error: { code: "RATE_LIMITED", message: "Too many requests" },
      });
      return;
    }

    next();
  }

  private memoryHit(key: string, windowMs: number) {
    const now = Date.now();
    const bucket = this.buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      this.buckets.set(key, { count: 1, resetAt: now + windowMs });
    } else {
      bucket.count += 1;
    }
    const current = this.buckets.get(key)!;
    if (this.buckets.size > 5000) {
      for (const [k, v] of this.buckets) {
        if (v.resetAt <= now) this.buckets.delete(k);
      }
    }
    return { count: current.count, resetAt: current.resetAt };
  }

  private async tryRedis(
    key: string,
    windowMs: number,
  ): Promise<{ count: number; resetAt: number } | null> {
    if (!this.redis) return null;
    const hit = await this.redis.incrWithTtl(`rl:${key}`, windowMs);
    if (!hit) return null;
    return { count: hit.count, resetAt: Date.now() + hit.ttlMs };
  }
}
