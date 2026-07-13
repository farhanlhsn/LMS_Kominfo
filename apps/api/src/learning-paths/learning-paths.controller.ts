import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject, UseGuards, Req } from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { LearningPathsService } from "./learning-paths.service";
import { CreateLearningPathDto, UpdateLearningPathDto, AddCourseToPathDto, LearningPathQueryDto } from "./dto/learning-path.dto";

@Controller("learning-paths")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearningPathsController {
  constructor(
    @Inject(LearningPathsService) private readonly paths: LearningPathsService
  ) {}

  @Post()
  @Permissions(PERMISSIONS.coursesCreate)
  async create(@Req() req: AuthenticatedRequest, @Body() dto: CreateLearningPathDto) {
    return { data: await this.paths.create(req.organization!, dto) };
  }

  @Get()
  async findAll(@Req() req: AuthenticatedRequest, @Query() query: LearningPathQueryDto) {
    return this.paths.findAll(req.organization!, query);
  }

  @Get(":idOrSlug")
  async findOne(@Req() req: AuthenticatedRequest, @Param("idOrSlug") idOrSlug: string) {
    return { data: await this.paths.findOne(req.organization!, idOrSlug) };
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.coursesUpdate)
  async update(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateLearningPathDto) {
    return { data: await this.paths.update(req.organization!, id, dto) };
  }

  @Delete(":id")
  @Permissions(PERMISSIONS.coursesUpdate)
  async delete(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return await this.paths.delete(req.organization!, id);
  }

  @Post(":id/courses")
  @Permissions(PERMISSIONS.coursesUpdate)
  async addCourse(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: AddCourseToPathDto) {
    return { data: await this.paths.addCourse(req.organization!, id, dto) };
  }

  @Delete(":id/courses/:courseId")
  @Permissions(PERMISSIONS.coursesUpdate)
  async removeCourse(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Param("courseId") courseId: string) {
    return await this.paths.removeCourse(req.organization!, id, courseId);
  }

  @Post(":id/courses/reorder")
  @Permissions(PERMISSIONS.coursesUpdate)
  async reorderCourses(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() body: { courseIds: string[] }) {
    return { data: await this.paths.reorderCourses(req.organization!, id, body.courseIds) };
  }

  @Post(":id/enroll")
  async enroll(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return { data: await this.paths.enroll(req.organization!, req.user.id, id) };
  }

  @Get("enrollments/mine")
  async myEnrollments(@Req() req: AuthenticatedRequest) {
    return { data: await this.paths.getEnrollments(req.organization!, req.user.id) };
  }
}
