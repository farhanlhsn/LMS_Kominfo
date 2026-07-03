import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { CoreLmsService } from "./core-lms.service";
import { CoursesController } from "./courses.controller";
import { InstructorController } from "./instructor.controller";
import { LearningController } from "./learning.controller";

@Module({
  imports: [RbacModule],
  controllers: [CoursesController, InstructorController, LearningController],
  providers: [CoreLmsService],
  exports: [CoreLmsService],
})
export class CoreLmsModule {}

export class CoursesModule extends CoreLmsModule {}
export class CourseCategoriesModule extends CoreLmsModule {}
export class CourseModulesModule extends CoreLmsModule {}
export class LessonsModule extends CoreLmsModule {}
export class ActivitiesModule extends CoreLmsModule {}
export class EnrollmentsModule extends CoreLmsModule {}
export class ProgressModule extends CoreLmsModule {}
