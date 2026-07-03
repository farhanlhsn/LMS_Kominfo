import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
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
import {
  CreateLearnerBookmarkDto,
  CreateLearnerNoteDto,
  ListWorkspaceItemsDto,
  UpdateLearnerBookmarkDto,
  UpdateLearnerNoteDto,
  UpdateTranscriptSegmentDto,
  UpdateWorkspacePreferencesDto,
  UpdateWorkspaceStateDto,
  UpsertTranscriptDto,
  WorkspaceStateQueryDto,
} from "./dto/learning-workspace.dto";
import { LearningWorkspaceService } from "./learning-workspace.service";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class LearningWorkspaceController {
  constructor(
    @Inject(LearningWorkspaceService)
    private readonly workspace: LearningWorkspaceService,
  ) {}

  @Get("learn/workspace/preferences")
  preferences(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.workspace.getPreferences(organization.id, user.id);
  }

  @Patch("learn/workspace/preferences")
  updatePreferences(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspacePreferencesDto,
  ) {
    return this.workspace.updatePreferences(organization.id, user.id, dto);
  }

  @Get("learn/workspace/state")
  state(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: WorkspaceStateQueryDto,
  ) {
    return this.workspace.getState(organization.id, user.id, query);
  }

  @Patch("learn/workspace/state")
  updateState(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateWorkspaceStateDto,
  ) {
    return this.workspace.updateState(organization.id, user.id, dto);
  }

  @Get("learn/notes")
  notes(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWorkspaceItemsDto,
  ) {
    return this.workspace.listNotes(organization.id, user.id, query);
  }

  @Post("learn/notes")
  createNote(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearnerNoteDto,
  ) {
    return this.workspace.createNote(organization.id, user.id, dto);
  }

  @Patch("learn/notes/:noteId")
  updateNote(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("noteId") noteId: string,
    @Body() dto: UpdateLearnerNoteDto,
  ) {
    return this.workspace.updateNote(organization.id, user.id, noteId, dto);
  }

  @Delete("learn/notes/:noteId")
  deleteNote(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("noteId") noteId: string,
  ) {
    return this.workspace.deleteNote(organization.id, user.id, noteId);
  }

  @Get("learn/bookmarks")
  bookmarks(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: ListWorkspaceItemsDto,
  ) {
    return this.workspace.listBookmarks(organization.id, user.id, query);
  }

  @Post("learn/bookmarks")
  createBookmark(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLearnerBookmarkDto,
  ) {
    return this.workspace.createBookmark(organization.id, user.id, dto);
  }

  @Patch("learn/bookmarks/:bookmarkId")
  updateBookmark(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookmarkId") bookmarkId: string,
    @Body() dto: UpdateLearnerBookmarkDto,
  ) {
    return this.workspace.updateBookmark(
      organization.id,
      user.id,
      bookmarkId,
      dto,
    );
  }

  @Delete("learn/bookmarks/:bookmarkId")
  deleteBookmark(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("bookmarkId") bookmarkId: string,
  ) {
    return this.workspace.deleteBookmark(
      organization.id,
      user.id,
      bookmarkId,
    );
  }

  @Get("learn/activities/:activityId/transcript")
  transcript(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.workspace.getTranscript(organization.id, user.id, activityId);
  }

  @Get("learn/activities/:activityId/workspace-context")
  context(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.workspace.getWorkspaceContext(
      organization.id,
      user.id,
      activityId,
    );
  }
}

@Controller("instructor")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class InstructorTranscriptController {
  constructor(
    @Inject(LearningWorkspaceService)
    private readonly workspace: LearningWorkspaceService,
  ) {}

  @Get("activities/:activityId/transcript")
  @Permissions(PERMISSIONS.coursesRead)
  transcript(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
  ) {
    return this.workspace.instructorTranscript(organization, user.id, activityId);
  }

  @Post("activities/:activityId/transcript")
  @Permissions(PERMISSIONS.coursesUpdate)
  upsertTranscript(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("activityId") activityId: string,
    @Body() dto: UpsertTranscriptDto,
  ) {
    return this.workspace.upsertInstructorTranscript(
      organization,
      user.id,
      activityId,
      dto,
    );
  }

  @Patch("transcript-segments/:segmentId")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateSegment(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("segmentId") segmentId: string,
    @Body() dto: UpdateTranscriptSegmentDto,
  ) {
    return this.workspace.updateTranscriptSegment(
      organization,
      user.id,
      segmentId,
      dto,
    );
  }

  @Delete("transcript-segments/:segmentId")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteSegment(
    @ActiveOrganization() organization: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("segmentId") segmentId: string,
  ) {
    return this.workspace.deleteTranscriptSegment(
      organization,
      user.id,
      segmentId,
    );
  }
}
