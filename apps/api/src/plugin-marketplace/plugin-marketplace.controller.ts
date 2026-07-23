import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
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
import { PluginMarketplaceService } from "./plugin-marketplace.service";
import {
  CreatePluginListingDto,
  CreatePluginReviewDto,
  InstallPluginDto,
  UpdatePluginInstallationStatusDto,
  UpdatePluginListingDto,
  UpdatePluginListingStatusDto,
  UpdatePluginPolicyDto,
  UpdatePluginReviewStatusDto,
} from "./dto/plugin-marketplace.dto";

@Controller("admin/plugin-marketplace/listings")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class PluginListingController {
  constructor(
    @Inject(PluginMarketplaceService)
    private readonly service: PluginMarketplaceService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.pluginsConfigure)
  list(
    @ActiveOrganization() organization: OrganizationContext,
    @Query("status") status?: string,
  ) {
    return this.service.listListings(organization.id, status);
  }

  @Post()
  @Permissions(PERMISSIONS.pluginsConfigure)
  create(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePluginListingDto,
  ) {
    return this.service.createListing(organization, user.id, dto);
  }

  @Get(":id")
  @Permissions(PERMISSIONS.pluginsConfigure)
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getListing(organization.id, id);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.pluginsConfigure)
  update(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdatePluginListingDto,
  ) {
    return this.service.updateListing(organization.id, id, dto);
  }

  @Patch(":id/status")
  @Permissions(PERMISSIONS.pluginsConfigure)
  updateStatus(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePluginListingStatusDto,
  ) {
    return this.service.updateListingStatus(organization.id, user.id, id, dto);
  }
}

@Controller("admin/plugin-marketplace/reviews")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class PluginReviewController {
  constructor(
    @Inject(PluginMarketplaceService)
    private readonly service: PluginMarketplaceService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.pluginsConfigure)
  list(
    @ActiveOrganization() organization: OrganizationContext,
    @Query("listingId") listingId?: string,
  ) {
    return this.service.listReviews(organization.id, listingId);
  }

  @Post()
  @Permissions(PERMISSIONS.pluginsConfigure)
  create(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePluginReviewDto,
  ) {
    return this.service.createReview(organization, user.id, dto);
  }

  @Patch(":id/status")
  @Permissions(PERMISSIONS.pluginsConfigure)
  updateStatus(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") id: string,
    @Body() dto: UpdatePluginReviewStatusDto,
  ) {
    return this.service.updateReviewStatus(organization.id, id, dto);
  }
}

@Controller("admin/plugin-marketplace/installations")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class PluginInstallationController {
  constructor(
    @Inject(PluginMarketplaceService)
    private readonly service: PluginMarketplaceService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.pluginsConfigure)
  list(@ActiveOrganization() organization: OrganizationContext) {
    return this.service.listInstallations(organization.id);
  }

  @Post()
  @Permissions(PERMISSIONS.pluginsConfigure)
  install(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InstallPluginDto,
  ) {
    return this.service.installPlugin(organization, user, dto);
  }

  @Patch(":id/status")
  @Permissions(PERMISSIONS.pluginsConfigure)
  updateStatus(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdatePluginInstallationStatusDto,
  ) {
    return this.service.updateInstallationStatus(
      organization.id,
      user,
      id,
      dto,
    );
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.pluginsConfigure)
  uninstall(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.uninstallPlugin(organization.id, user, id);
  }
}

@Controller("admin/plugin-marketplace/policy")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class PluginPolicyController {
  constructor(
    @Inject(PluginMarketplaceService)
    private readonly service: PluginMarketplaceService,
  ) {}

  @Get()
  @Permissions(PERMISSIONS.pluginsConfigure)
  get(@ActiveOrganization() organization: OrganizationContext) {
    return this.service.getPolicy(organization.id);
  }

  @Put()
  @Permissions(PERMISSIONS.pluginsConfigure)
  update(
    @ActiveOrganization() organization: OrganizationContext,
    @Body() dto: UpdatePluginPolicyDto,
  ) {
    return this.service.updatePolicy(organization.id, dto);
  }
}
