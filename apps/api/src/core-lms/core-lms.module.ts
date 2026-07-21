import { Module } from "@nestjs/common";
import { CertificatesModule } from "../certificates/certificates.module";
import { EngagementModule } from "../engagement/engagement.module";
import { RbacModule } from "../rbac/rbac.module";
import { RedisModule } from "../redis/redis.module";
import { CoreLmsService } from "./core-lms.service";
import { CoursesController } from "./courses.controller";
import { InstructorController } from "./instructor.controller";
import { LearningController } from "./learning.controller";

@Module({
  imports: [RbacModule, CertificatesModule, RedisModule, EngagementModule],
  controllers: [CoursesController, InstructorController, LearningController],
  providers: [CoreLmsService],
  exports: [CoreLmsService],
})
export class CoreLmsModule {}
