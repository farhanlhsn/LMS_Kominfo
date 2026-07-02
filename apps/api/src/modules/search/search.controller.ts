import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/auth.controller';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('Search')
@ApiBearerAuth('JWT-auth')
@Controller('search')
@UseGuards(JwtAuthGuard)
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @Throttle({ search: { ttl: 60000, limit: 60 } })
  @ApiOperation({ summary: 'Pencarian global (course + lesson). Min 2 karakter.' })
  search(
    @Query('q') q: string,
    @Query('limit') limit: string,
    @CurrentUser() user: ReqUser,
  ) {
    // Regional admin & student hanya melihat hasil di region mereka
    const regionScope = user.role === 'REGIONAL_ADMIN' || user.role === 'STUDENT' ? user.regionId : undefined;
    return this.searchService.search(q || '', {
      regionId: regionScope,
      limit: limit ? parseInt(limit, 10) : undefined,
      onlyPublished: true,
    });
  }
}
