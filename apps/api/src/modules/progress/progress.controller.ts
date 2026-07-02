import { Controller, Get, Patch, Param, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProgressService } from './progress.service';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles } from '../auth/roles.guard';

// Inline CurrentUser decorator
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Progress')
@ApiBearerAuth('JWT-auth')
@Controller('courses/:courseId/progress')
@UseGuards(JwtAuthGuard)
export class ProgressController {
  constructor(private readonly progressService: ProgressService) {}

  @Get()
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Mendapatkan progress belajar student pada kursus' })
  getCourseProgress(
    @Param('courseId') courseId: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.progressService.getCourseProgress(courseId, user.userId);
  }

  @Patch()
  @Roles('STUDENT')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Memperbarui progress lesson (complete / video position)' })
  updateProgress(
    @Param('courseId') courseId: string,
    @Body() dto: UpdateProgressDto,
    @CurrentUser() user: ReqUser,
  ) {
    return this.progressService.updateProgress(courseId, user.userId, dto);
  }
}
