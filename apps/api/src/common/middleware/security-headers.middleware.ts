import { Injectable, NestMiddleware } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Injectable()
export class SecurityHeadersMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction) {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("X-Frame-Options", "DENY");
    response.setHeader("X-XSS-Protection", "1; mode=block");
    response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    response.setHeader("X-Permitted-Cross-Domain-Policies", "none");
    response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

    // Strict-Transport-Security (only in production)
    if (process.env.NODE_ENV === "production") {
      response.setHeader("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");
    }

    // Content-Security-Policy
    response.setHeader(
      "Content-Security-Policy",
      [
        "default-src 'none'",
        "script-src 'none'",
        "style-src 'none'",
        "img-src 'self' data: https:",
        "font-src 'none'",
        "connect-src 'self' https:",
        "frame-ancestors 'none'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'",
      ].join("; ")
    );

    next();
  }
}
