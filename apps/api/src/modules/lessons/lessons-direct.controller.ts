import { Controller, Get, Param, UseGuards, Post, HttpCode, HttpStatus, Body } from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LessonsService } from './lessons.service';
import { JwtAuthGuard } from '../auth/auth.controller';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; }

/**
 * Endpoint lesson flat (tidak nested di module) — untuk student/instructor yang
 * sudah memegang lessonId langsung. Path ini cocok dengan API Contract dan
 * memungkinkan halaman /learn/{lessonId} melakukan fetch langsung tanpa
 * mengetahui moduleId.
 */
@ApiTags('Lessons')
@ApiBearerAuth('JWT-auth')
@Controller('lessons')
@UseGuards(JwtAuthGuard)
export class LessonsDirectController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Mendapatkan detail lesson langsung berdasarkan ID (tanpa perlu moduleId)' })
  findOne(@Param('id') id: string) {
    return this.lessonsService.findById(id);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menandai lesson selesai (kompat dengan API Contract: PATCH-style endpoint)' })
  complete(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.lessonsService.complete(id, user.userId);
  }

  @Post(':id/track-video')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Memperbarui posisi video (untuk resume playback)' })
  trackVideo(
    @Param('id') id: string,
    @Body() body: { positionSec: number; durationSec: number },
    @CurrentUser() user: ReqUser,
  ) {
    return this.lessonsService.trackVideo(id, user.userId, body.positionSec, body.durationSec);
  }
}
