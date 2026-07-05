import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { RbacModule } from "../rbac/rbac.module";
import { LearningPathsController } from "./learning-paths.controller";
import { LearningPathsService } from "./learning-paths.service";

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [LearningPathsController],
  providers: [LearningPathsService],
  exports: [LearningPathsService],
})
export class LearningPathsModule {}
