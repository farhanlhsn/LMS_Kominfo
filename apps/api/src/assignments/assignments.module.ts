import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import {
  InstructorAssignmentsController,
  LearnerAssignmentsController,
} from "./assignments.controller";
import { AssignmentsService } from "./assignments.service";
import { EngagementModule } from "../engagement/engagement.module";

@Module({
  imports: [PrismaModule, EngagementModule],
  controllers: [InstructorAssignmentsController, LearnerAssignmentsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
