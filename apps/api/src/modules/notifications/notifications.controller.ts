import { Controller, Get, Patch, Delete, Param, Query, UseGuards, HttpCode, HttpStatus, Post, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Notifications')
@ApiBearerAuth('JWT-auth')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan daftar notifikasi user saat ini' })
  list(
    @Query('unreadOnly') unreadOnly: string,
    @Query('limit') limit: string,
    @Query('cursor') cursor: string,
    @CurrentUser() user: ReqUser,
  ) {
    return this.notificationsService.list(user.userId, {
      unreadOnly: unreadOnly === 'true',
      limit: limit ? parseInt(limit, 10) : 20,
      cursor,
    });
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Mendapatkan jumlah notifikasi belum dibaca (untuk badge UI)' })
  async unreadCount(@CurrentUser() user: ReqUser) {
    const count = await this.notificationsService.unreadCount(user.userId);
    return { count };
  }

  @Patch(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tandai satu notifikasi sudah dibaca' })
  markAsRead(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Patch('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tandai semua notifikasi sudah dibaca' })
  async markAllAsRead(@CurrentUser() user: ReqUser) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Hapus satu notifikasi' })
  remove(@Param('id') id: string, @CurrentUser() user: ReqUser) {
    return this.notificationsService.remove(id, user.userId);
  }

  // ===== Admin endpoints (broadcast) =====

  @Post('broadcast/region')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Broadcast notifikasi ke semua user di region (admin)' })
  async broadcastRegion(
    @Body() body: { title: string; body: string; type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' },
    @CurrentUser() user: ReqUser,
  ) {
    const regionId = user.role === 'REGIONAL_ADMIN' ? user.regionId : body['regionId' as any];
    if (!regionId) return { count: 0, error: 'Region not determined' };
    return this.notificationsService.broadcastToRegion(regionId, {
      title: body.title,
      body: body.body,
      type: body.type as any,
    });
  }
}
