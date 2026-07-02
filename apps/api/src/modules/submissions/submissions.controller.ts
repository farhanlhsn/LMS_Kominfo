import { Controller, Post, Get, Patch, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { SubmissionsService } from './submissions.service';
import { CreateSubmissionDto, GradeSubmissionDto } from './dto/submissions.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@Controller('submissions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Post()
  @Roles('STUDENT')
  @HttpCode(HttpStatus.CREATED)
  submitAssignment(@Body() dto: CreateSubmissionDto, @CurrentUser() user: ReqUser) {
    return this.submissionsService.submitAssignment(dto, user.userId);
  }

  @Get('me')
  @Roles('STUDENT')
  getMySubmissions(@CurrentUser() user: ReqUser) {
    return this.submissionsService.getMySubmissions(user.userId);
  }

  @Get('assignment/:assignmentId')
  @Roles('INSTRUCTOR', 'REGIONAL_ADMIN', 'SUPER_ADMIN')
  getAssignmentSubmissions(
    @Param('assignmentId') assignmentId: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.submissionsService.getAssignmentSubmissions(assignmentId, user.userId, user.role);
  }

  @Patch(':id/grade')
  @Roles('INSTRUCTOR', 'REGIONAL_ADMIN', 'SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  gradeSubmission(
    @Param('id') id: string,
    @Body() dto: GradeSubmissionDto,
    @CurrentUser() user: ReqUser,
  ) {
    return this.submissionsService.gradeSubmission(id, dto, user.userId, user.role);
  }
}
