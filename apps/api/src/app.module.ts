import { join } from "path";
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { validateEnvironment } from "@lms/config";
import { AiModule } from "./ai/ai.module";
import { AuthModule } from "./auth/auth.module";
import { ActivityContentModule } from "./activity-content/activity-content.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { CertificatesModule } from "./certificates/certificates.module";
import { RequestLoggingMiddleware } from "./common/middleware/request-logging.middleware";
import { ContentLibraryModule } from "./content-library/content-library.module";
import { ContentProcessingModule } from "./content-processing/content-processing.module";
import { CoreLmsModule } from "./core-lms/core-lms.module";
import { FilesModule } from "./files/files.module";
import { EngagementModule } from "./engagement/engagement.module";
import { HealthModule } from "./health/health.module";
import { LearningWorkspaceModule } from "./learning-workspace/learning-workspace.module";
import { GoalsModule } from "./goals/goals.module";
import { OrganizationsModule } from "./organizations/organizations.module";
import { PluginsModule } from "./plugins/plugins.module";
import { PrismaModule } from "./prisma/prisma.module";
import { QuizModule } from "./quiz/quiz.module";
import { RbacModule } from "./rbac/rbac.module";

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
    OrganizationsModule,
    PluginsModule,
    LearningWorkspaceModule,
    GoalsModule,
    QuizModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggingMiddleware).forRoutes("{*path}");
  }
}
