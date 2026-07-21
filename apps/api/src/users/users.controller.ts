import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
  ListUsersQueryDto,
  UpdateUserDto,
  UpdateUserStatusDto,
} from "./dto/users.dto";
import { UsersService } from "./users.service";

@Controller("admin/users")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class UsersController {
  constructor(@Inject(UsersService) private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PERMISSIONS.usersRead)
  list(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: ListUsersQueryDto,
  ) {
    return this.usersService.list(org.id, query);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.usersRead)
  get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.usersService.get(org.id, id);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.usersUpdate)
  update(
    @Param("id") id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(id, dto);
  }

  @Patch(":id/status")
  @Permissions(PERMISSIONS.usersUpdate)
  updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto);
  }
}
