import { Module } from '@nestjs/common';
import { AssignmentManagementController, AssignmentsController, SubmissionsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';

@Module({
  controllers: [AssignmentManagementController, AssignmentsController, SubmissionsController],
  providers: [AssignmentsService],
  exports: [AssignmentsService],
})
export class AssignmentsModule {}
