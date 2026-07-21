import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { CoreLmsService } from "./core-lms.service";
import {
  CreateActivityDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ReorderDto,
  UpdateActivityDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from "./dto/course.dto";

@Controller("instructor")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorController {
  constructor(
    @Inject(CoreLmsService) private readonly coreLmsService: CoreLmsService,
  ) {}

  @Get("courses")
  @Permissions(PERMISSIONS.coursesRead)
  listCourses(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coreLmsService.listInstructorCourses(
      organization.id,
      user.id,
      organization.isPlatformAdmin,
    );
  }

  @Get("courses/:id")
  @Permissions(PERMISSIONS.coursesRead)
  getCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.getInstructorCourse(
      organization,
      user.id,
      courseId,
    );
  }

  @Post("courses")
  @Permissions(PERMISSIONS.coursesCreate)
  createCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateCourseDto,
  ) {
    return this.coreLmsService.createCourse(organization, user.id, dto);
  }

  @Patch("courses/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
    @Body() dto: UpdateCourseDto,
  ) {
    return this.coreLmsService.updateCourse(
      organization,
      user.id,
      courseId,
      dto,
    );
  }

  @Delete("courses/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.deleteCourse(organization, user.id, courseId);
  }

  @Post("courses/:id/publish")
  @Permissions(PERMISSIONS.coursesPublish)
  publishCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.publishCourse(organization, user.id, courseId);
  }

  @Post("courses/:id/archive")
  @Permissions(PERMISSIONS.coursesPublish)
  archiveCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.archiveCourse(organization, user.id, courseId);
  }

  @Post("courses/:id/duplicate")
  @Permissions(PERMISSIONS.coursesCreate)
  duplicateCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") courseId: string,
  ) {
    return this.coreLmsService.duplicateCourse(organization, user.id, courseId);
  }

  @Post("courses/:courseId/modules")
  @Permissions(PERMISSIONS.coursesUpdate)
  createModule(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
    @Body() dto: CreateModuleDto,
  ) {
    return this.coreLmsService.createModule(
      organization,
      user.id,
      courseId,
      dto,
    );
  }

  @Patch("modules/:moduleId")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateModule(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("moduleId") moduleId: string,
    @Body() dto: UpdateModuleDto,
  ) {
    return this.coreLmsService.updateModule(
      organization,
      user.id,
      moduleId,
      dto,
    );
  }

  @Delete("modules/:moduleId")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteModule(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("moduleId") moduleId: string,
  ) {
    return this.coreLmsService.deleteModule(organization, user.id, moduleId);
  }

  @Patch("courses/:courseId/modules/reorder")
  @Permissions(PERMISSIONS.coursesUpdate)
  reorderModules(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.coreLmsService.reorderModules(
      organization,
      user.id,
      courseId,
      dto,
    );
  }

  @Post("modules/:moduleId/lessons")
  @Permissions(PERMISSIONS.coursesUpdate)
  createLesson(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("moduleId") moduleId: string,
    @Body() dto: CreateLessonDto,
  ) {
    return this.coreLmsService.createLesson(
      organization,
      user.id,
      moduleId,
      dto,
    );
  }

  @Patch("lessons/:lessonId")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateLesson(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("lessonId") lessonId: string,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.coreLmsService.updateLesson(
      organization,
      user.id,
      lessonId,
      dto,
    );
  }

  @Delete("lessons/:lessonId")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteLesson(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("lessonId") lessonId: string,
  ) {
    return this.coreLmsService.deleteLesson(organization, user.id, lessonId);
  }

  @Patch("modules/:moduleId/lessons/reorder")
  @Permissions(PERMISSIONS.coursesUpdate)
  reorderLessons(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("moduleId") moduleId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.coreLmsService.reorderLessons(
      organization,
      user.id,
      moduleId,
      dto,
    );
  }

  @Post("lessons/:lessonId/activities")
  @Permissions(PERMISSIONS.coursesUpdate)
  createActivity(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("lessonId") lessonId: string,
    @Body() dto: CreateActivityDto,
  ) {
    return this.coreLmsService.createActivity(
      organization,
      user.id,
      lessonId,
      dto,
    );
  }

  @Patch("activities/:activityId")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateActivity(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: UpdateActivityDto,
  ) {
    return this.coreLmsService.updateActivity(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Delete("activities/:activityId")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteActivity(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.coreLmsService.deleteActivity(
      organization,
      user.id,
      activityId,
    );
  }

  @Patch("lessons/:lessonId/activities/reorder")
  @Permissions(PERMISSIONS.coursesUpdate)
  reorderActivities(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("lessonId") lessonId: string,
    @Body() dto: ReorderDto,
  ) {
    return this.coreLmsService.reorderActivities(
      organization,
      user.id,
      lessonId,
      dto,
    );
  }
}
