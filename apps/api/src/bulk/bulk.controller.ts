import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
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
import { BulkOperationService } from "./bulk.service";
import { CancelBulkJobDto, CreateBulkJobDto, ListBulkJobsQueryDto } from "./dto/bulk.dto";

@Controller("admin/bulk/jobs")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class BulkOperationController {
  constructor(
    @Inject(BulkOperationService) private readonly service: BulkOperationService,
  ) {}

  @Post()
  @Permissions(PERMISSIONS.platformAdmin)
  async create(
    @Body() body: CreateBulkJobDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    this.service.assertCanRun(org.id, org.isPlatformAdmin);
    const { job, items } = await this.service.createAndRun(org.id, user.id, body);
    return {
      data: { job, items },
    };
  }

  @Get()
  @Permissions(PERMISSIONS.platformAdmin)
  list(
    @Query() query: ListBulkJobsQueryDto,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.list(org.id, query).then((data: unknown) => ({ data }));
  }

  @Get(":id")
  @Permissions(PERMISSIONS.platformAdmin)
  get(@Param("id") id: string, @ActiveOrganization() org: OrganizationContext) {
    return this.service.findOne(org.id, id).then((data) => ({ data }));
  }

  @Post(":id/cancel")
  @Permissions(PERMISSIONS.platformAdmin)
  cancel(
    @Param("id") id: string,
    @Body() body: CancelBulkJobDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.cancel(org.id, user.id, id, body.reason).then((data) => ({ data }));
  }

  @Post(":id/resume")
  @Permissions(PERMISSIONS.platformAdmin)
  resume(
    @Param("id") id: string,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.resume(org.id, id).then((data) => ({ data }));
  }
}
