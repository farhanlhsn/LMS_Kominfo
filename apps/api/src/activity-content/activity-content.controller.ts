import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
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
import { ActivityContentService } from "./activity-content.service";
import {
  AttachFileDto,
  AttachLibraryItemDto,
  ReprocessContentDto,
  UpdateActivityContentDto,
  VideoProgressDto,
} from "./dto/activity-content.dto";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class ActivityContentController {
  constructor(
    @Inject(ActivityContentService)
    private readonly activityContentService: ActivityContentService,
  ) {}

  @Patch("instructor/activities/:activityId/content")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesUpdate)
  updateContent(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: UpdateActivityContentDto,
  ) {
    return this.activityContentService.updateActivityContent(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Post("instructor/activities/:activityId/attach-file")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesUpdate)
  attachFile(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: AttachFileDto,
  ) {
    return this.activityContentService.attachFile(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Post("instructor/activities/:activityId/attach-library-item")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesUpdate)
  attachLibraryItem(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: AttachLibraryItemDto,
  ) {
    return this.activityContentService.attachLibraryItem(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Post("instructor/activities/:activityId/reprocess-content")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.contentProcess)
  reprocess(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: ReprocessContentDto,
  ) {
    return this.activityContentService.reprocessContent(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Get("learn/activities/:activityId/content")
  getLearningContent(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.activityContentService.getLearningContent(
      organization,
      user.id,
      activityId,
    );
  }

  @Patch("learn/activities/:activityId/video-progress")
  updateVideoProgress(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: VideoProgressDto,
  ) {
    return this.activityContentService.updateVideoProgress(
      organization,
      user.id,
      activityId,
      dto,
    );
  }
}
