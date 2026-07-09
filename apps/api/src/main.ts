import { config } from "dotenv";
import { join } from "path";

// Load root .env before anything else — Prisma reads DATABASE_URL
// directly from process.env before NestJS ConfigModule bootstraps.
// CWD at runtime is apps/api/ so we go up 2 levels to the monorepo root.
config({ path: join(process.cwd(), "..", "..", ".env") });

import "reflect-metadata";
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { API_VERSION_PREFIX, DEFAULT_PORTS } from "@lms/config";
import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";

function isLocalDevelopmentOrigin(origin: string) {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  try {
    const url = new URL(origin);
    return (
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1", "[::1]"].includes(url.hostname)
    );
  } catch {
    return false;
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? DEFAULT_PORTS.api);
  const allowedOrigins = new Set(
    [
      process.env.PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      ...(process.env.CORS_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ].filter((value): value is string => Boolean(value)),
  );

  app.setGlobalPrefix(API_VERSION_PREFIX);
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error("Origin is not allowed by CORS"));
    },
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(port);
}

void bootstrap();
