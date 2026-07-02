import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

// Inline CurrentUser
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface RequestUser {
  userId: string;
  email: string;
  role: string;
  regionId: string;
}

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @ApiOperation({ summary: 'Mendapatkan daftar pengguna (admin)' })
  findAll(@Query() query: QueryUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.findAll({
      page: query.page || 1,
      limit: query.limit || 10,
      search: query.search,
      role: query.role,
      regionId: query.regionId,
      isActive: query.isActive,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
    }, user);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mendapatkan profil user saat ini (self-service)' })
  me(@CurrentUser() user: RequestUser) {
    return this.usersService.findById(user.userId, user);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update profil user saat ini (name, phone, organization, bio, avatar)' })
  updateMe(@CurrentUser() user: RequestUser, @Body() dto: { name?: string; phoneNumber?: string; organization?: string; bio?: string; avatarUrl?: string }) {
    return this.usersService.updateMe(user.userId, dto);
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Ubah password user saat ini (perlu password lama)' })
  changeMyPassword(@CurrentUser() user: RequestUser, @Body() dto: { currentPassword: string; newPassword: string }) {
    return this.usersService.changeMyPassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  @Get(':id')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @ApiOperation({ summary: 'Mendapatkan detail pengguna berdasarkan ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.findById(id, user);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat pengguna baru (admin)' })
  create(@Body() dto: CreateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.create(dto, user);
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @ApiOperation({ summary: 'Memperbarui data pengguna' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: RequestUser) {
    return this.usersService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete pengguna' })
  remove(@Param('id') id: string, @CurrentUser() user: RequestUser) {
    return this.usersService.remove(id, user);
  }

  @Post(':id/reset-password')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset password pengguna (admin)' })
  resetPassword(
    @Param('id') id: string,
    @Body('password') password: string,
    @CurrentUser() user: RequestUser,
  ) {
    return this.usersService.resetPassword(id, password, user);
  }
}
