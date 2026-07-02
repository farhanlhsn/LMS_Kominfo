import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GamificationService } from './gamification.service';
import { JwtAuthGuard } from '../auth/auth.controller';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Gamification')
@ApiBearerAuth('JWT-auth')
@Controller('gamification')
@UseGuards(JwtAuthGuard)
export class GamificationController {
  constructor(private readonly gamificationService: GamificationService) {}

  @Get('leaderboard/region')
  @ApiOperation({ summary: 'Leaderboard XP per region (top N)' })
  getRegionLeaderboard(
    @Query('limit') limit: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.gamificationService.getLeaderboard(user.regionId, limit ? parseInt(limit, 10) : 10);
  }

  @Get('leaderboard/course/:courseId')
  @ApiOperation({ summary: 'Leaderboard XP per kursus (top N)' })
  getCourseLeaderboard(
    @Param('courseId') courseId: string,
    @Query('limit') limit: string,
  ) {
    return this.gamificationService.getCourseLeaderboard(courseId, limit ? parseInt(limit, 10) : 10);
  }

  @Get('badges/me')
  @ApiOperation({ summary: 'Daftar badge yang dimiliki user saat ini' })
  getMyBadges(@CurrentUser() user: ReqUser) {
    return this.gamificationService.getUserBadges(user.userId);
  }
}
