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
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { CoreLmsService } from "./core-lms.service";
import { UpdateActivityProgressDto } from "./dto/course.dto";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearningController {
  constructor(
    @Inject(CoreLmsService) private readonly coreLmsService: CoreLmsService,
  ) {}

  @Get("my/enrollments")
  myEnrollments(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.coreLmsService.myEnrollments(organization.id, user.id);
  }

  @Get("my/courses/:courseId/progress")
  courseProgress(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
  ) {
    return this.coreLmsService.courseProgress(
      organization.id,
      user.id,
      courseId,
    );
  }

  @Get("learn/courses/:courseId")
  learnCourse(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
  ) {
    return this.coreLmsService.learnCourse(organization.id, user.id, courseId);
  }

  @Get("learn/lessons/:lessonId")
  learnLesson(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("lessonId") lessonId: string,
  ) {
    return this.coreLmsService.learnLesson(organization.id, user.id, lessonId);
  }

  @Post("learn/activities/:activityId/start")
  startActivity(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.coreLmsService.startActivity(
      organization.id,
      user.id,
      activityId,
    );
  }

  @Post("learn/activities/:activityId/complete")
  completeActivity(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.coreLmsService.completeActivity(
      organization.id,
      user.id,
      activityId,
    );
  }

  @Patch("learn/activities/:activityId/progress")
  updateProgress(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: UpdateActivityProgressDto,
  ) {
    return this.coreLmsService.updateActivityProgress(
      organization.id,
      user.id,
      activityId,
      dto,
    );
  }
}
