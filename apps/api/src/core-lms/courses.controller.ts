import {
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { CoreLmsService } from "./core-lms.service";

@ApiTags("Catalog")
@ApiBearerAuth()
@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class CoursesController {
  constructor(
    @Inject(CoreLmsService) private readonly coreLmsService: CoreLmsService,
  ) {}

  @Get("course-categories")
  listCategories(@ActiveOrganization() organization: OrganizationContext) {
    return this.coreLmsService.listCategories(organization.id);
  }

  @Get("courses")
  @ApiOperation({ summary: "Published course catalog (paginated)" })
  listCourses(
    @ActiveOrganization() organization: OrganizationContext,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    return this.coreLmsService.listCatalog(organization.id, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search,
    });
  }

  @Get("courses/:slugOrId")
  getCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("slugOrId") slugOrId: string,
  ) {
    return this.coreLmsService.getCourseDetail(organization.id, slugOrId);
  }

  @Get("courses/:id/curriculum")
  getCurriculum(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.getCurriculum(organization.id, courseId);
  }

  @Post("courses/:id/enroll")
  enroll(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.enroll(organization.id, user.id, courseId);
  }
}
