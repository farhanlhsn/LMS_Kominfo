import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UseGuards } from "@nestjs/common";
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
import { AiGeneratedItemService } from "./ai-generated-item.service";
import { AiStatusService } from "./ai-status.service";
import { AiTutorService } from "./ai-tutor.service";
import { AiGradingAssistantService } from "./ai-grading-assistant.service";
import { AskAiTutorDto } from "./dto/ai.dto";
import {
  GenerateCourseQuestionsDto,
  GenerateVideoQuizDto,
  GenerateVideoSummaryDto,
  ListAiGeneratedItemsQueryDto,
  UpdateAiGeneratedItemDto,
} from "./dto/video-ai.dto";
import { PluginEntitlementGuard } from "../plugins/guards/plugin-entitlement.guard";
import { RequiresPlugin } from "../plugins/decorators/requires-plugin.decorator";
import {
  AiChatProviderFactory,
  AiEmbeddingProviderFactory,
} from "./ai-provider.factories";
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";

@Controller("ai")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AiController {
  constructor(private readonly statusService: AiStatusService) {}

  @Get("status")
  @Permissions(PERMISSIONS.coursesRead)
  getStatus(@ActiveOrganization() organization: OrganizationContext) {
    return this.statusService.getStatus(organization.id);
  }
}

@Controller("learn/ai")
@UseGuards(
  JwtAuthGuard,
  OrganizationContextGuard,
  PluginEntitlementGuard,
)
@RequiresPlugin("plugin.ai_tutor")
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
@UseGuards(
  JwtAuthGuard,
  OrganizationContextGuard,
  PermissionsGuard,
  PluginEntitlementGuard,
)
@RequiresPlugin("plugin.ai_course_indexer")
export class InstructorAiController {
  constructor(
    private readonly indexingService: AiIndexingService,
    private readonly generatedItems: AiGeneratedItemService,
  ) {}

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

  @Get("index/sources")
  @Permissions(PERMISSIONS.coursesUpdate)
  sources(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
  ) {
    return this.indexingService.courseSources(organization, user.id, courseId);
  }

  @Post("questions")
  @Permissions(PERMISSIONS.coursesUpdate)
  @RequiresPlugin("plugin.ai_question_generator")
  generateQuestions(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("courseId") courseId: string,
    @Body() dto: GenerateCourseQuestionsDto,
  ) {
    return this.generatedItems.generateCourseQuestions(
      organization,
      user.id,
      courseId,
      dto,
    );
  }
}

@Controller("admin/ai-provider")
@UseGuards(
  JwtAuthGuard,
  OrganizationContextGuard,
  PermissionsGuard,
  PluginEntitlementGuard,
)
@Permissions(PERMISSIONS.pluginsConfigure)
@RequiresPlugin("plugin.ai_provider")
export class AdminAiProviderController {
  constructor(
    private readonly runtime: AiTenantRuntimeService,
    private readonly chatFactory: AiChatProviderFactory,
    private readonly embeddingFactory: AiEmbeddingProviderFactory,
  ) {}

  @Post("test")
  async test(@ActiveOrganization() organization: OrganizationContext) {
    const config = await this.runtime.assertReady(organization.id);
    const chat = this.chatFactory.create(config);
    const embedding = this.embeddingFactory.create(config);
    const [chatResult, vector] = await Promise.all([
      chat.generateText({
        systemPrompt: "Reply with OK only.",
        userPrompt: "Connection test",
        temperature: 0,
        maxOutputTokens: 8,
      }),
      embedding.embedText("connection test"),
    ]);
    return {
      ok: Boolean(chatResult.text.trim()) && vector.length > 0,
      chatProvider: chat.capabilities.providerName,
      chatModel: chat.capabilities.model,
      embeddingProvider: embedding.capabilities.providerName,
      embeddingModel: embedding.capabilities.model,
      embeddingDimensions: vector.length,
    };
  }
}

@Controller("instructor/activities/:activityId/ai")
@UseGuards(
  JwtAuthGuard,
  OrganizationContextGuard,
  PermissionsGuard,
  PluginEntitlementGuard,
)
export class InstructorActivityAiController {
  constructor(private readonly generatedItems: AiGeneratedItemService) {}

  @Get("generated-items")
  @Permissions(PERMISSIONS.coursesRead)
  listGeneratedItems(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.generatedItems.listForActivity(organization, user.id, activityId);
  }

  @Post("video-summary")
  @Permissions(PERMISSIONS.coursesUpdate)
  @RequiresPlugin("plugin.ai_content_studio")
  generateVideoSummary(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: GenerateVideoSummaryDto,
  ) {
    return this.generatedItems.generateVideoSummary(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Post("video-quiz")
  @Permissions(PERMISSIONS.coursesUpdate)
  @RequiresPlugin("plugin.ai_question_generator")
  generateVideoQuiz(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: GenerateVideoQuizDto,
  ) {
    return this.generatedItems.generateVideoQuiz(
      organization,
      user.id,
      activityId,
      dto,
    );
  }
}

@Controller("instructor/quiz-answers")
@UseGuards(
  JwtAuthGuard,
  OrganizationContextGuard,
  PermissionsGuard,
  PluginEntitlementGuard,
)
@RequiresPlugin("plugin.ai_grading_assistant")
export class InstructorAiGradingController {
  constructor(private readonly grading: AiGradingAssistantService) {}

  @Post(":answerId/ai-grading-suggestion")
  @Permissions(PERMISSIONS.quizGrade)
  suggest(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("answerId") answerId: string,
  ) {
    return this.grading.suggest(organization, user.id, answerId);
  }
}

@Controller("instructor/ai/items")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorAiItemsController {
  constructor(private readonly generatedItems: AiGeneratedItemService) {}

  @Get()
  @Permissions(PERMISSIONS.coursesRead)
  list(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListAiGeneratedItemsQueryDto,
  ) {
    return this.generatedItems.listForOrganization(organization, user.id, query);
  }

  @Get(":itemId")
  @Permissions(PERMISSIONS.coursesRead)
  get(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("itemId") itemId: string,
  ) {
    return this.generatedItems.getItem(organization.id, itemId);
  }

  @Patch(":itemId")
  @Permissions(PERMISSIONS.coursesUpdate)
  update(
    @ActiveOrganization() organization: OrganizationContext,
    @Param("itemId") itemId: string,
    @Body() dto: UpdateAiGeneratedItemDto,
  ) {
    return this.generatedItems.updateItemContent(organization.id, itemId, dto);
  }

  @Patch(":itemId/approve")
  @Permissions(PERMISSIONS.coursesUpdate)
  approve(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ) {
    return this.generatedItems.approveItem(organization, user.id, itemId);
  }

  @Patch(":itemId/reject")
  @Permissions(PERMISSIONS.coursesUpdate)
  reject(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
    @Body("reason") reason?: string,
  ) {
    return this.generatedItems.rejectItem(organization, user.id, itemId, reason);
  }

  @Post(":itemId/publish")
  @Permissions(PERMISSIONS.coursesUpdate)
  publish(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("itemId") itemId: string,
  ) {
    return this.generatedItems.publishItem(organization, user.id, itemId);
  }
}
