import {
  Controller, Get, Post, Patch, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { GradeSubmissionDto } from './dto/grade-submission.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

@ApiTags('Assignments')
@ApiBearerAuth('JWT-auth')
// Nested under lessons
@Controller('lessons/:lessonId/assignment')
@UseGuards(JwtAuthGuard)
export class AssignmentManagementController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan assignment pada lesson' })
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.assignmentsService.findByLesson(lessonId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat assignment baru pada lesson' })
  create(@Param('lessonId') lessonId: string, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(lessonId, dto);
  }
}

// Assignment actions
@ApiTags('Assignments')
@ApiBearerAuth('JWT-auth')
@Controller('assignments')
@UseGuards(JwtAuthGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail assignment + semua submission' })
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findById(id);
  }

  @Post(':id/submit')
  @Roles('STUDENT')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit tugas dengan materialId hasil upload' })
  submit(@Param('id') id: string, @Body('materialId') materialId: string, @CurrentUser() user: { userId: string }) {
    return this.assignmentsService.submit(id, user.userId, materialId);
  }

  @Get(':id/my-submission')
  @Roles('STUDENT')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Mendapatkan submission milik student saat ini' })
  getMySubmission(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.assignmentsService.getMySubmission(id, user.userId);
  }

  @Get(':id/submissions')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Mendapatkan semua submission pada assignment' })
  getSubmissions(@Param('id') id: string) {
    return this.assignmentsService.getSubmissions(id);
  }
}

// Grading
@ApiTags('Submissions')
@ApiBearerAuth('JWT-auth')
@Controller('submissions')
@UseGuards(JwtAuthGuard)
export class SubmissionsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Patch(':id/grade')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Memberikan nilai dan feedback pada submission' })
  grade(@Param('id') id: string, @Body() dto: GradeSubmissionDto, @CurrentUser() user: { userId: string }) {
    return this.assignmentsService.grade(id, dto, user.userId);
  }
}
