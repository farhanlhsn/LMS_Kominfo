import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
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
import { PopoutService } from "./popout.service";
import { IssuePopoutTokenDto } from "./dto/popout.dto";

@Controller("popout")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class PopoutController {
  constructor(@Inject(PopoutService) private readonly service: PopoutService) {}

  @Post("issue")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesRead)
  issue(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: IssuePopoutTokenDto,
  ) {
    return this.service.issueToken(organization, user.id, dto.lessonId, dto.ttlMs);
  }

  // Validate is intentionally not JWT-guarded so the popout window can call it
  // before the user logs into the new tab; token alone is the credential.
  @Get("validate/:token")
  validate(@Param("token") token: string) {
    return this.service.validateToken(token);
  }

  @Delete(":token")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.coursesRead)
  revoke(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("token") token: string,
  ) {
    return this.service.revokeToken(organization.id, user.id, token);
  }
}
