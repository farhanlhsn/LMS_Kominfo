import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { LessonsService } from './lessons.service';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; }

@ApiTags('Lessons')
@ApiBearerAuth('JWT-auth')
@Controller('modules/:moduleId/lessons')
@UseGuards(JwtAuthGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua lesson dalam module' })
  findByModule(@Param('moduleId') moduleId: string) {
    return this.lessonsService.findByModule(moduleId);
  }

  @Get(':lessonId')
  @ApiOperation({ summary: 'Mendapatkan detail lesson' })
  findOne(@Param('lessonId') lessonId: string) {
    return this.lessonsService.findById(lessonId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat lesson baru dalam module' })
  create(@Param('moduleId') moduleId: string, @Body() dto: CreateLessonDto) {
    return this.lessonsService.create(moduleId, dto);
  }

  @Patch(':lessonId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Memperbarui lesson' })
  update(@Param('lessonId') lessonId: string, @Body() dto: UpdateLessonDto) {
    return this.lessonsService.update(lessonId, dto);
  }

  @Delete(':lessonId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menghapus lesson' })
  remove(@Param('lessonId') lessonId: string) {
    return this.lessonsService.remove(lessonId);
  }

  @Post(':lessonId/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menandai lesson selesai (student)' })
  complete(@Param('lessonId') lessonId: string, @CurrentUser() user: ReqUser) {
    return this.lessonsService.complete(lessonId, user.userId);
  }
}
