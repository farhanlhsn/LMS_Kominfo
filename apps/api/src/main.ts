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

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const port = Number(process.env.API_PORT ?? DEFAULT_PORTS.api);

  app.setGlobalPrefix(API_VERSION_PREFIX);
  app.enableCors({
    origin: true,
    credentials: true
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());

  await app.listen(port);
}

void bootstrap();
