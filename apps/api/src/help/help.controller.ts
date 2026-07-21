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
  CreateHelpArticleDto,
  CreateHelpCategoryDto,
  CreateSupportTicketDto,
  CreateSupportTicketReplyDto,
  HelpListQueryDto,
  SupportTicketListQueryDto,
  UpdateHelpArticleDto,
  UpdateHelpCategoryDto,
  UpdateSupportTicketDto,
} from "./dto/help.dto";
import { HelpService } from "./help.service";

@Controller("help")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class HelpController {
  constructor(@Inject(HelpService) private readonly service: HelpService) {}

  @Get("categories")
  categories(@ActiveOrganization() org: OrganizationContext) {
    return this.service.listCategories(org.id);
  }

  @Get("articles")
  articles(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: HelpListQueryDto,
  ) {
    return this.service.listArticles(org.id, {
      q: query.q,
      categoryId: query.categoryId,
      limit: query.limit,
    });
  }

  @Get("articles/:id")
  article(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.getArticle(org.id, id, user.id);
  }
}

@Controller("admin/help")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminHelpController {
  constructor(@Inject(HelpService) private readonly service: HelpService) {}

  @Post("categories")
  @Permissions(PERMISSIONS.coursesUpdate)
  createCategory(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpCategoryDto,
  ) {
    return this.service.createCategory(org, user.id, dto);
  }

  @Patch("categories/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateCategory(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateHelpCategoryDto,
  ) {
    return this.service.updateCategory(org, user.id, id, dto);
  }

  @Delete("categories/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteCategory(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.deleteCategory(org, user.id, id);
  }

  @Post("articles")
  @Permissions(PERMISSIONS.coursesUpdate)
  createArticle(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateHelpArticleDto,
  ) {
    return this.service.createArticle(org, user.id, dto);
  }

  @Patch("articles/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  updateArticle(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateHelpArticleDto,
  ) {
    return this.service.updateArticle(org, user.id, id, dto);
  }

  @Delete("articles/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  deleteArticle(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
  ) {
    return this.service.deleteArticle(org, user.id, id);
  }
}

@Controller("support/tickets")
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class SupportTicketController {
  constructor(@Inject(HelpService) private readonly service: HelpService) {}

  @Get()
  list(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: SupportTicketListQueryDto,
  ) {
    return this.service.listTickets(org.id, {
      userId: user.id,
      status: query.status,
      limit: query.limit,
    });
  }

  @Post()
  create(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSupportTicketDto,
  ) {
    return this.service.createTicket(org, user.id, dto);
  }

  @Get(":id")
  get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getTicket(org.id, id);
  }

  @Post(":id/replies")
  reply(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: CreateSupportTicketReplyDto,
  ) {
    return this.service.createReply(org, user.id, id, dto);
  }
}

@Controller("admin/support/tickets")
@UseGuards(JwtAuthGuard, OrganizationContextGuard, PermissionsGuard)
export class AdminSupportTicketController {
  constructor(@Inject(HelpService) private readonly service: HelpService) {}

  @Get()
  @Permissions(PERMISSIONS.usersRead)
  list(
    @ActiveOrganization() org: OrganizationContext,
    @Query() query: SupportTicketListQueryDto,
  ) {
    return this.service.listTickets(org.id, {
      status: query.status,
      limit: query.limit,
    });
  }

  @Get(":id")
  @Permissions(PERMISSIONS.usersRead)
  get(
    @ActiveOrganization() org: OrganizationContext,
    @Param("id") id: string,
  ) {
    return this.service.getTicket(org.id, id);
  }

  @Patch(":id")
  @Permissions(PERMISSIONS.usersUpdate)
  update(
    @ActiveOrganization() org: OrganizationContext,
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.service.updateTicket(org, user.id, id, dto);
  }
}
