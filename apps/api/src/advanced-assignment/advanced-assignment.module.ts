import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuthModule } from "../auth/auth.module";
import { RbacModule } from "../rbac/rbac.module";
import { AdvancedAssignmentService } from "./advanced-assignment.service";
import {
  InstructorAssignmentAdvancedController,
  InstructorShowcaseController,
  InstructorShowcaseItemController,
  InstructorSubmissionAdvancedController,
  LearnerPeerReviewController,
  LearnerPortfolioController,
  LearnerSubmissionAnnotationController,
  PublicPortfolioController,
  PublicShowcaseController,
} from "./advanced-assignment.controller";
import {
  MockPlagiarismProvider,
  PLAGIARISM_PROVIDER,
} from "./plagiarism.provider";

@Module({
  imports: [AuthModule, RbacModule],
  providers: [
    AdvancedAssignmentService,
    MockPlagiarismProvider,
    {
      provide: PLAGIARISM_PROVIDER,
      useExisting: MockPlagiarismProvider,
    },
  ],
  controllers: [
    InstructorAssignmentAdvancedController,
    InstructorSubmissionAdvancedController,
    InstructorShowcaseController,
    InstructorShowcaseItemController,
    LearnerPeerReviewController,
    LearnerSubmissionAnnotationController,
    LearnerPortfolioController,
    PublicPortfolioController,
    PublicShowcaseController,
  ],
  exports: [AdvancedAssignmentService],
})
export class AdvancedAssignmentModule {}
