import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './common/storage/storage.module';
import { CacheModule } from './common/cache/cache.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RegionsModule } from './modules/regions/regions.module';
import { CoursesModule } from './modules/courses/courses.module';
import { CourseModulesModule } from './modules/course-modules/course-modules.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { ProgressModule } from './modules/progress/progress.module';
import { MaterialsModule } from './modules/materials/materials.module';
import { SubmissionsModule } from './modules/submissions/submissions.module';
import { GamificationModule } from './modules/gamification/gamification.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SearchModule } from './modules/search/search.module';
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '.env.local'] }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: parseInt(process.env['RATE_LIMIT_AUTHENTICATED_PER_MIN'] || '300', 10),
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: parseInt(process.env['RATE_LIMIT_AUTH_PER_MIN'] || '10', 10),
      },
      {
        name: 'ai',
        ttl: 60000,
        limit: parseInt(process.env['RATE_LIMIT_AI_PER_MIN'] || '15', 10),
      },
      {
        name: 'search',
        ttl: 60000,
        limit: parseInt(process.env['RATE_LIMIT_SEARCH_PER_MIN'] || '60', 10),
      },
    ]),
    PrismaModule,
    StorageModule,
    CacheModule,
    HealthModule,
    AuthModule,
    UsersModule,
    RegionsModule,
    CoursesModule,
    CourseModulesModule,
    LessonsModule,
    QuizzesModule,
    AssignmentsModule,
    ProgressModule,
    MaterialsModule,
    SubmissionsModule,
    GamificationModule,
    CertificatesModule,
    AnalyticsModule,
    AiModule,
    NotificationsModule,
    SearchModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
