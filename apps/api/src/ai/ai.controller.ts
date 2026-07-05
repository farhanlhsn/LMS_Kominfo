import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { PERMISSIONS } from "@lms/shared";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";
import { AiIndexingService } from "./ai-indexing.service";
import { AiStatusService } from "./ai-status.service";
import { AiTutorService } from "./ai-tutor.service";
import { AskAiTutorDto } from "./dto/ai.dto";

@Controller("ai")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class AiController {
  constructor(private readonly statusService: AiStatusService) {}

  @Get("status")
  getStatus(@ActiveOrganization() organization: OrganizationContext) {
    return this.statusService.getStatus(organization.id);
  }
}

@Controller("learn/ai")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearnerAiController {
  constructor(private readonly tutorService: AiTutorService) {}

  @Post("tutor")
  askTutor(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AskAiTutorDto,
  ) {
    return this.tutorService.ask(organization.id, user.id, dto);
  }

  @Post("tutor/stream")
  streamTutor(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AskAiTutorDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const stream = this.tutorService.streamAsk(organization.id, user.id, dto);
    const subscription = stream.subscribe({
      next: (val) => {
        res.write(`data: ${JSON.stringify(val.data)}\n\n`);
      },
      error: (err) => {
        res.write(
          `data: ${JSON.stringify({ type: "error", message: err.message })}\n\n`,
        );
        res.end();
      },
      complete: () => {
        res.write(`data: [DONE]\n\n`);
        res.end();
      },
    });

    req.on("close", () => {
      subscription.unsubscribe();
    });
  }

  @Post("messages/:messageId/feedback")
  submitFeedback(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("messageId") messageId: string,
    @Body("feedback") feedback: "LIKE" | "DISLIKE",
  ) {
    return this.tutorService.submitFeedback(organization.id, user.id, messageId, feedback);
  }
}

@Controller("instructor/courses/:courseId/ai")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorAiController {
  constructor(private readonly indexingService: AiIndexingService) {}

  @Post("index")
  @Permissions(PERMISSIONS.coursesUpdate)
  index(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
  ) {
    return this.indexingService.indexCourse(organization, user.id, courseId);
  }

  @Get("index/status")
  @Permissions(PERMISSIONS.coursesRead)
  status(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
  ) {
    return this.indexingService.courseStatus(organization, user.id, courseId);
  }
}
