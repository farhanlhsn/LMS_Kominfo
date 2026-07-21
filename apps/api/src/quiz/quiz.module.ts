import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { InstructorQuizController, LearnerQuizController } from "./quiz.controller";
import { QuizService } from "./quiz.service";

@Module({
  imports: [RbacModule],
  controllers: [InstructorQuizController, LearnerQuizController],
  providers: [QuizService],
  exports: [QuizService],
})
export class QuizModule {}
