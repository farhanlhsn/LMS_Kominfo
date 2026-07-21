import { Injectable, Logger, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { requestMetrics } from "../metrics/request-metrics";

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(request: Request, response: Response, next: NextFunction) {
    const startedAt = Date.now();
    requestMetrics.begin();

    response.on("finish", () => {
      const durationMs = Date.now() - startedAt;
      requestMetrics.end(
        response.statusCode,
        durationMs,
        request.originalUrl ?? request.url ?? "",
      );
      const level =
        response.statusCode >= 500
          ? "error"
          : response.statusCode >= 400
            ? "warn"
            : "log";
      this.logger[level](
        `${request.method} ${request.originalUrl} ${response.statusCode} ${durationMs}ms`,
      );
    });

    next();
  }
}
