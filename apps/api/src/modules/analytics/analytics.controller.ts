import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Analytics')
@ApiBearerAuth('JWT-auth')
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('student')
  @Roles('STUDENT')
  @ApiOperation({ summary: 'Statistik ringkas untuk dashboard student' })
  getStudentStats(@CurrentUser() user: ReqUser) {
    return this.analyticsService.getStudentStats(user.userId);
  }

  @Get('admin')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @ApiOperation({ summary: 'Statistik untuk admin (filtered by role/region)' })
  getAdminStats(@CurrentUser() user: ReqUser) {
    // Regional admin only sees their region stats, Super admin sees all
    const regionId = user.role === 'REGIONAL_ADMIN' ? user.regionId : undefined;
    return this.analyticsService.getAdminStats(regionId);
  }
}
