import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ModerationTargetType, Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import {
  CreateActionDto,
  CreateReportDto,
  ListReportsQueryDto,
  UpdateReportDto,
} from "./dto/moderation.dto";

@Injectable()
export class ModerationService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ============================================================
  // Reports (user-submitted)
  // ============================================================

  async createReport(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: CreateReportDto,
  ) {
    if (dto.targetType === "USER" && dto.targetId === user.id) {
      throw new BadRequestException("You cannot report yourself");
    }
    const report = await this.prisma.moderationReport.create({
      data: {
        organizationId: organization.id,
        reporterId: user.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
        status: "OPEN",
      },
    });
    await this.audit(organization.id, user.id, "moderation.report.created", report.id, {
      targetType: dto.targetType,
      targetId: dto.targetId,
    });
    return report;
  }

  // ============================================================
  // Admin: report queue
  // ============================================================

  async listReports(
    organization: OrganizationContext,
    query: ListReportsQueryDto = {},
  ) {
    return this.prisma.moderationReport.findMany({
      where: {
        organizationId: organization.id,
        targetType: query.targetType,
        status: query.status,
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        reporter: { select: { id: true, name: true, email: true } },
        reviewedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateReport(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    reportId: string,
    dto: UpdateReportDto,
  ) {
    const existing = await this.prisma.moderationReport.findFirst({
      where: { id: reportId, organizationId: organization.id },
    });
    if (!existing) {
      throw new NotFoundException("Moderation report not found");
    }
    const updated = await this.prisma.moderationReport.update({
      where: { id: existing.id },
      data: {
        status: dto.status,
        resolution: dto.resolution,
        reviewedById: dto.status ? user.id : undefined,
        reviewedAt: dto.status ? new Date() : undefined,
      },
    });
    await this.audit(organization.id, user.id, "moderation.report.updated", updated.id, {
      status: dto.status,
    });
    return updated;
  }

  // ============================================================
  // Admin: actions
  // ============================================================

  async listActions(organization: OrganizationContext) {
    return this.prisma.moderationAction.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { actor: { select: { id: true, name: true, email: true } } },
    });
  }

  async createAction(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: CreateActionDto,
  ) {
    if (dto.actionType === "BAN" || dto.actionType === "SUSPEND") {
      if (!user.isPlatformAdmin && !user.role?.includes("admin")) {
        // Permission check: the controller already enforces organizations.manage
        // for the admin endpoint. This is a defensive fallback.
        throw new ForbiddenException(
          "Banning or suspending a user requires admin privileges",
        );
      }
    }
    const action = await this.prisma.moderationAction.create({
      data: {
        organizationId: organization.id,
        actorId: user.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        actionType: dto.actionType,
        reason: dto.reason,
        notes: dto.notes,
      },
    });
    await this.audit(organization.id, user.id, "moderation.action.created", action.id, {
      actionType: dto.actionType,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });
    return action;
  }

  // ============================================================
  // Flag aggregation
  // ============================================================

  async flagContent(
    organization: OrganizationContext,
    user: AuthenticatedUser | null,
    targetType: string,
    targetId: string,
    flagType: string,
    options: { autoDetected?: boolean; confidence?: number; reason?: string } = {},
  ) {
    if (!targetType) {
      throw new BadRequestException("targetType is required");
    }
    return this.prisma.contentFlag.create({
      data: {
        organizationId: organization.id,
        flaggedById: user?.id,
        targetType: targetType as ModerationTargetType,
        targetId,
        flagType,
        autoDetected: options.autoDetected ?? false,
        confidence: options.confidence,
        reason: options.reason,
      },
    });
  }

  async listFlags(organization: OrganizationContext) {
    return this.prisma.contentFlag.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Moderation",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
