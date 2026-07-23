import { PERMISSIONS } from "@lms/shared";
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
import { ApiBearerAuth,ApiOperation,ApiTags } from "@nestjs/swagger";
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
import {
  AddConversationMembersDto,
  BlockUserDto,
  CreateConversationDto,
  EditMessageDto,
  ListMessagesQueryDto,
  MarkReadDto,
  ReactMessageDto,
  SendMessageDto,
} from "./dto/messaging.dto";
import { MessagingService } from "./messaging.service";

@ApiTags("Messaging")
@ApiBearerAuth()
@Controller("messages")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class MessagingController {
  constructor(
    @Inject(MessagingService) private readonly service: MessagingService,
  ) {}

  @Get("conversations")
  list(@ActiveOrganization() org: OrganizationContext, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listConversations(org.id, user.id).then((data) => ({ data }));
  }

  @Post("conversations")
  create(
    @Body() body: CreateConversationDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.createConversation(org.id, user.id, body).then((data) => ({ data }));
  }

  @Get("conversations/:id")
  get(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.getConversation(org.id, user.id, id).then((data) => ({ data }));
  }

  @Post("conversations/:id/members")
  addMembers(
    @Param("id") id: string,
    @Body() body: AddConversationMembersDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .addMembers(org.id, user.id, id, body.userIds)
      .then((data) => ({ data }));
  }

  @Get("conversations/:id/messages")
  @ApiOperation({ summary: "List messages (cursor pagination)" })
  listMessages(
    @Param("id") id: string,
    @Query() query: ListMessagesQueryDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .listMessages(org.id, user.id, id, { cursor: query.cursor, limit: query.limit })
      .then(({ data, meta }) => ({ data, meta }));
  }

  @Post("conversations/:id/messages")
  send(
    @Param("id") id: string,
    @Body() body: SendMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.sendMessage(org.id, user.id, id, body).then((data) => ({ data }));
  }

  @Patch("messages/:id")
  edit(
    @Param("id") id: string,
    @Body() body: EditMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.editMessage(org.id, user.id, id, body.content).then((data) => ({ data }));
  }

  @Delete("messages/:id")
  remove(
    @Param("id") id: string,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service.deleteMessage(org.id, user.id, id).then((data) => ({ data }));
  }

  @Post("messages/:id/reactions")
  react(
    @Param("id") id: string,
    @Body() body: ReactMessageDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .reactToMessage(org.id, user.id, id, body.emoji)
      .then((data) => ({ data }));
  }

  @Post("conversations/:id/read")
  markRead(
    @Param("id") id: string,
    @Body() body: MarkReadDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .markRead(org.id, user.id, id, body.messageId)
      .then((data) => ({ data }));
  }

  @Post("blocks")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.usersUpdate)
  block(
    @Body() body: BlockUserDto,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .blockUser(org.id, user.id, body.userId)
      .then((data) => ({ data }));
  }

  @Delete("blocks/:userId")
  @UseGuards(PermissionsGuard)
  @Permissions(PERMISSIONS.usersUpdate)
  unblock(
    @Param("userId") targetId: string,
    @CurrentUser() user: AuthenticatedUser,
    @ActiveOrganization() org: OrganizationContext,
  ) {
    return this.service
      .unblockUser(org.id, user.id, targetId)
      .then(() => ({ data: { removed: true, userId: targetId } }));
  }
}
