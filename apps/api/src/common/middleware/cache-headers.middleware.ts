import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class CacheHeadersMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    // API responses: no cache for dynamic data
    if (request.path.startsWith("/api/v1")) {
      response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      response.setHeader("Pragma", "no-cache");
      response.setHeader("Expires", "0");
      response.setHeader("Surrogate-Control", "no-store");
    }

    // Health endpoint: short cache
    if (request.path === "/api/v1/health") {
      response.setHeader("Cache-Control", "public, max-age=30");
    }

    next();
  }
}
