import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { ResponseTransformInterceptor } from './common/interceptors/response.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  app.use(helmet());

  app.enableCors({
    origin: process.env['CORS_ORIGINS']?.split(',') ?? [process.env['WEB_URL'] || 'http://localhost:3000'],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(new ResponseTransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Swagger / OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Kominfo AI-LMS API')
    .setDescription('REST API untuk Kominfo AI Learning Management System')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Masukkan JWT access token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Auth', 'Autentikasi & manajemen sesi')
    .addTag('Users', 'Manajemen pengguna (admin)')
    .addTag('Regions', 'Manajemen wilayah Kominfo')
    .addTag('Courses', 'Manajemen kursus')
    .addTag('Course Modules', 'Modul di dalam kursus')
    .addTag('Lessons', 'Pelajaran di dalam modul')
    .addTag('Materials', 'Upload & manajemen materi')
    .addTag('Quizzes', 'Kuis & soal')
    .addTag('Assignments', 'Tugas & submission')
    .addTag('Submissions', 'Penilaian submission')
    .addTag('Progress', 'Progress belajar per course')
    .addTag('Gamification', 'XP, leaderboard, badge')
    .addTag('Certificates', 'Sertifikat kelulusan')
    .addTag('Analytics', 'Statistik per role')
    .addTag('AI', 'AI Tutor & RAG endpoints')
    .addTag('Health', 'Health check')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env['PORT'] ? parseInt(process.env['PORT'], 10) : 4000;
  await app.listen(port);
  logger.log(`API running on http://localhost:${port}/api/v1`);
  logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

void bootstrap();
