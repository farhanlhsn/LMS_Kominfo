import {
  Controller,
  Get,
  Inject,
  Query,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { GlobalSearchQueryDto, SearchAnalyticsQueryDto } from "./dto/search.dto";
import { SearchService } from "./search.service";
import { type SearchEntityType } from "./search.provider";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class SearchController {
  constructor(
    @Inject(SearchService) private readonly service: SearchService,
  ) {}

  @Get("search")
  global(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: GlobalSearchQueryDto,
  ) {
    return this.service.search(
      org,
      user.id,
      query.q,
      (query.types as SearchEntityType[] | undefined) ?? undefined,
      query.courseId,
      query.limit,
    );
  }
}

@Controller("admin/search")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminSearchController {
  constructor(
    @Inject(SearchService) private readonly service: SearchService,
  ) {}

  @Get("analytics")
  @Permissions(PERMISSIONS.analyticsView)
  analytics(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: SearchAnalyticsQueryDto,
  ) {
    return this.service.getAnalytics(
      org.id,
      query.days ?? 30,
      query.limit ?? 25,
    );
  }
}
