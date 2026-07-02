import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { QueryCourseDto } from './dto/query-course.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; email: string; role: string; regionId: string; }

@ApiTags('Courses')
@ApiBearerAuth('JWT-auth')
@Controller('courses')
export class CoursesController {
  constructor(private readonly coursesService: CoursesService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mendapatkan daftar kursus (filtered by role)' })
  findAll(@Query() query: QueryCourseDto, @CurrentUser() user: ReqUser) {
    return this.coursesService.findAll({
      page: query.page || 1, limit: query.limit || 10,
      search: query.search, category: query.category,
      difficulty: query.difficulty, regionId: query.regionId,
      status: query.status, sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    }, user);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mendapatkan detail kursus lengkap dengan modules & lessons' })
  findOne(@Param('id') id: string) {
    return this.coursesService.findById(id);
  }

  @Get('slug/:slug')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Mendapatkan kursus berdasarkan slug (termasuk modules & lessons)' })
  findBySlug(@Param('slug') slug: string) {
    return this.coursesService.findBySlug(slug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat kursus baru' })
  create(@Body() dto: CreateCourseDto, @CurrentUser() user: ReqUser) {
    return this.coursesService.create(dto, user.userId);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Memperbarui data kursus' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto, @CurrentUser() user: ReqUser) {
    return this.coursesService.update(id, dto as Record<string, unknown>, user);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mengarsipkan (soft-delete) kursus' })
  remove(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.coursesService.remove(id, user);
  }

  @Post(':id/publish')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mempublikasikan kursus' })
  publish(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.coursesService.publish(id, user);
  }

  @Post(':id/archive')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mengarsipkan kursus' })
  archive(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.coursesService.archive(id, user);
  }

  @Post(':id/enroll')
  @UseGuards(JwtAuthGuard)
  @Roles('STUDENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mendaftar sebagai siswa pada kursus' })
  enroll(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.coursesService.enroll(id, user.userId);
  }
}
