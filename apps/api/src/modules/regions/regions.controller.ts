import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { RegionsService } from './regions.service';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface RequestUser {
  userId: string; email: string; role: string; regionId: string;
}

@ApiTags('Regions')
@ApiBearerAuth('JWT-auth')
@Controller('regions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR', 'STUDENT')
  @ApiOperation({ summary: 'Mendapatkan daftar seluruh region' })
  findAll(@CurrentUser() _user: RequestUser) {
    return this.regionsService.findAll();
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR', 'STUDENT')
  @ApiOperation({ summary: 'Mendapatkan detail region' })
  findOne(@Param('id') id: string) {
    return this.regionsService.findById(id);
  }

  @Post()
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat region baru' })
  create(@Body() dto: CreateRegionDto) {
    return this.regionsService.create(dto);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Memperbarui branding region' })
  update(@Param('id') id: string, @Body() dto: UpdateRegionDto) {
    return this.regionsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menonaktifkan region (soft delete)' })
  remove(@Param('id') id: string) {
    return this.regionsService.remove(id);
  }
}
