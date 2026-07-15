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
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { ActiveOrganization } from "../rbac/decorators/active-organization.decorator";
import { CurrentUser } from "../rbac/decorators/current-user.decorator";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import {
  CreateTranscriptNoteDto,
  GenerateNoteContextDto,
  SearchTranscriptNotesDto,
  UpdateTranscriptNoteDto,
} from "./dto/notes.dto";
import { TranscriptNoteService } from "./notes.service";

@Controller("learn/transcript-notes")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class TranscriptNoteController {
  constructor(
    @Inject(TranscriptNoteService) private readonly service: TranscriptNoteService,
  ) {}

  @Get()
  list(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query("lessonId") lessonId?: string,
  ) {
    return this.service.list(org.id, user.id, lessonId);
  }

  @Get("search")
  search(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SearchTranscriptNotesDto,
  ) {
    return this.service.search(org.id, user.id, query);
  }

  @Post()
  create(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTranscriptNoteDto,
  ) {
    return this.service.create(org, user.id, dto);
  }

  @Patch(":id")
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateTranscriptNoteDto,
  ) {
    return this.service.update(org, user.id, id, dto);
  }

  @Delete(":id")
  remove(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.delete(org, user.id, id);
  }

  @Post(":id/context")
  generateContext(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: GenerateNoteContextDto,
  ) {
    return this.service.generateContext(org, user.id, id, dto);
  }

  @Get(":id/context")
  getContext(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.getContext(org.id, user.id, id);
  }

  @Post("export")
  export(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { lessonId?: string },
  ) {
    return this.service.exportNotes(org, user.id, body.lessonId);
  }
}
