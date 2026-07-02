import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CourseModulesService } from './course-modules.service';
import { CreateModuleDto } from './dto/create-module.dto';
import { UpdateModuleDto } from './dto/update-module.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

@ApiTags('Course Modules')
@ApiBearerAuth('JWT-auth')
@Controller('courses/:courseId/modules')
@UseGuards(JwtAuthGuard)
export class CourseModulesController {
  constructor(private readonly modulesService: CourseModulesService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan semua module dalam kursus' })
  findAll(@Param('courseId') courseId: string) {
    return this.modulesService.findByCourse(courseId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat module baru dalam kursus' })
  create(@Param('courseId') courseId: string, @Body() dto: CreateModuleDto) {
    return this.modulesService.create(courseId, dto);
  }

  @Get(':moduleId')
  @ApiOperation({ summary: 'Mendapatkan detail module' })
  findOne(@Param('moduleId') moduleId: string) {
    return this.modulesService.findById(moduleId);
  }

  @Patch(':moduleId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Memperbarui module' })
  update(@Param('moduleId') moduleId: string, @Body() dto: UpdateModuleDto) {
    return this.modulesService.update(moduleId, dto);
  }

  @Delete(':moduleId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menghapus module (cascade ke lessons)' })
  remove(@Param('moduleId') moduleId: string) {
    return this.modulesService.remove(moduleId);
  }
}
