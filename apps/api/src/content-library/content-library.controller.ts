import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ContentLibraryService } from "./content-library.service";
import {
  CreateContentLibraryItemDto,
  UpdateContentLibraryItemDto,
} from "./dto/content-library.dto";

@Controller("content-library")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class ContentLibraryController {
  constructor(
    @Inject(ContentLibraryService)
    private readonly contentLibraryService: ContentLibraryService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.filesRead)
  list(
    @ActiveOrganization() organization: OrganizationContext,
    @Query("search") search?: string,
    @Query("type") type?: string,
  ) {
    return this.contentLibraryService.list(organization.id, { search, type });
  }

  @Post()
  @Permissions(PERMISSIONS.contentLibraryManage)
  create(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateContentLibraryItemDto,
  ) {
    return this.contentLibraryService.create(organization, user.id, dto);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.filesRead)
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") itemId: string,
  ) {
    return this.contentLibraryService.get(organization.id, itemId);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.contentLibraryManage)
  update(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") itemId: string,
    @Body() dto: UpdateContentLibraryItemDto,
  ) {
    return this.contentLibraryService.update(organization.id, itemId, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.contentLibraryManage)
  delete(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") itemId: string,
  ) {
    return this.contentLibraryService.delete(organization.id, itemId);
  }
}
