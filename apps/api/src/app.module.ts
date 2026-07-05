import { join } from "path";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "@lms/config";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ActivityContentModule } from "./activity-content/activity-content.module";
import { AdvancedAssignmentModule } from "./advanced-assignment/advanced-assignment.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { RequestLoggingMiddleware } from "./common/middleware/request-logging.middleware";
import { SecurityHeadersMiddleware } from "./common/middleware/security-headers.middleware";
import { CacheHeadersMiddleware } from "./common/middleware/cache-headers.middleware";
import { RateLimitMiddleware } from "./common/middleware/rate-limit.middleware";
import { ContentLibraryModule } from "./content-library/content-library.module";
import { ContentProcessingModule } from "./content-processing/content-processing.module";
import { CoreLmsModule } from "./core-lms/core-lms.module";
import { FilesModule } from "./files/files.module";
import { EngagementModule } from "./engagement/engagement.module";
import { HealthModule } from "./health/health.module";
import { LearningWorkspaceModule } from "./learning-workspace/learning-workspace.module";
import { GoalsModule } from "./goals/goals.module";
import { AnalyticsModule } from "./analytics/analytics.module";
import { LearningPathsModule } from "./learning-paths/learning-paths.module";
import { GamificationModule } from "./gamification/gamification.module";
import { MarketplaceModule } from "./marketplace/marketplace.module";
import { EnterpriseModule } from "./enterprise/enterprise.module";
import { PushModule } from "./push/push.module";
import { ReviewsModule } from "./reviews/reviews.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PluginsModule } from "./plugins/plugins.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuizModule } from "./quiz/quiz.module";
import { RbacModule } from "./rbac/rbac.module";
import { ExperiencesModule } from "./experiences/experiences.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(process.cwd(), "..", "..", ".env"), ".env"],
      validate: validateEnvironment,
    }),
    PrismaModule,
    RbacModule,
    AiModule,
    AuthModule,
    AssignmentsModule,
    CertificatesModule,
    CoreLmsModule,
    EngagementModule,
    FilesModule,
    ContentLibraryModule,
    ActivityContentModule,
    ContentProcessingModule,
    AdvancedAssignmentModule,
    OrganizationsModule,
    PluginsModule,
    LearningWorkspaceModule,
    GoalsModule,
    AnalyticsModule,
    LearningPathsModule,
    GamificationModule,
    MarketplaceModule,
    EnterpriseModule,
    PushModule,
    ReviewsModule,
    QuizModule,
    HealthModule,
    ExperiencesModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes("{*path}");
    consumer.apply(SecurityHeadersMiddleware).forRoutes("{*path}");
    consumer.apply(CacheHeadersMiddleware).forRoutes("{*path}");
    consumer.apply(RateLimitMiddleware).forRoutes("{*path}");
  }
}
