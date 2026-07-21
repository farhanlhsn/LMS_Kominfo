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
import { Content3DService } from "./content-3d.service";
import {
  CreateThreeDAssetDto,
  CreateThreeDInteractionDto,
  CreateThreeDSceneDto,
  UpdateThreeDAssetDto,
} from "./dto/content-3d.dto";

@Controller("content-3d/assets")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class ThreeDAssetController {
  constructor(
    @Inject(Content3DService) private readonly service: Content3DService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.filesRead)
  list(
    @ActiveOrganization() organization: OrganizationContext,
    @Query("search") search?: string,
    @Query("format") format?: string,
  ) {
    return this.service.listAssets(organization.id, search, format);
  }

  @Post()
  @Permissions(PERMISSIONS.filesCreate)
  create(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateThreeDAssetDto,
  ) {
    return this.service.createAsset(organization, user.id, dto);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.filesRead)
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getAsset(organization.id, id);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.filesCreate)
  update(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdateThreeDAssetDto,
  ) {
    return this.service.updateAsset(organization.id, id, dto);
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.filesDelete)
  delete(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.deleteAsset(organization.id, id);
  }

  @Post(":id/preview")
  @Permissions(PERMISSIONS.filesCreate)
  generatePreview(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.generatePreviewThumbnail(organization.id, id);
  }

  @Get(":id/scenes")
  @Permissions(PERMISSIONS.filesRead)
  listScenes(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.listScenes(organization.id, id);
  }

  @Post(":id/scenes")
  @Permissions(PERMISSIONS.filesCreate)
  createScene(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateThreeDSceneDto,
  ) {
    return this.service.createScene(organization, user.id, id, dto);
  }
}

@Controller("content-3d/scenes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class ThreeDSceneController {
  constructor(
    @Inject(Content3DService) private readonly service: Content3DService,
  ) {}

  @Get(":id")
  @Permissions(PERMISSIONS.filesRead)
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getScene(organization.id, id);
  }

  @Post(":id/interactions")
  @Permissions(PERMISSIONS.filesCreate)
  createInteraction(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateThreeDInteractionDto,
  ) {
    return this.service.createInteraction(organization.id, user.id, id, dto);
  }
}
