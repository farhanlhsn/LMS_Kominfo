import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { requestMetrics } from "../common/metrics/request-metrics";
import { HealthService } from "./health.service";

function isPrivateOrLocalIp(ip: string | undefined): boolean {
  if (!ip) return false;
  const cleaned = ip.replace(/^::ffff:/, "");
  if (
    cleaned === "127.0.0.1" ||
    cleaned === "::1" ||
    cleaned === "localhost"
  ) {
    return true;
  }
  if (cleaned.startsWith("10.")) return true;
  if (cleaned.startsWith("192.168.")) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(cleaned)) return true;
  return false;
}

@ApiTags("Health")
@Controller("health")
export class HealthController {
  constructor(
    @Inject(HealthService) private readonly healthService: HealthService,
  ) {}

  @Get()
  @ApiOperation({ summary: "Dependency health probe" })
  getHealth() {
    return this.healthService.getHealth();
  }

  /** Liveness — process is up (deploy health gate can use this if full probe is flaky). */
  @Get("live")
  @ApiOperation({ summary: "Liveness probe" })
  getLive() {
    return { status: "ok", service: "api" };
  }

  /**
   * Process-local metrics. Allowed when:
   * - METRICS_TOKEN header matches env, or
   * - request is from loopback / private IP (compose network).
   */
  @Get("metrics")
  getMetrics(
    @Req() req: Request,
    @Headers("x-metrics-token") metricsToken?: string,
  ) {
    const expected = process.env.METRICS_TOKEN;
    if (expected && metricsToken === expected) {
      return { data: requestMetrics.snapshot() };
    }
    const ip =
      (typeof req.headers["x-forwarded-for"] === "string"
        ? req.headers["x-forwarded-for"].split(",")[0]?.trim()
        : undefined) ??
      req.ip ??
      req.socket?.remoteAddress;
    if (isPrivateOrLocalIp(ip) || process.env.NODE_ENV !== "production") {
      return { data: requestMetrics.snapshot() };
    }
    throw new ForbiddenException("Metrics endpoint is restricted");
  }
}
