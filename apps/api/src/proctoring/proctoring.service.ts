import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import {
  BatchIngestProctoringEventsDto,
  IngestProctoringEventDto,
  ReviewProctoringFlagDto,
} from "./dto/proctoring.dto";
import {
  PROCTORING_PROVIDER,
  ProctoringProvider,
} from "./proctoring.provider";

@Injectable()
export class ProctoringService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PROCTORING_PROVIDER) private readonly provider: ProctoringProvider,
  ) {}

  async startSession(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    payload: { attemptId: string; attemptType?: string; metadata?: Record<string, unknown> },
  ) {
    const existing = await this.prisma.proctoringSession.findFirst({
      where: {
        organizationId: organization.id,
        attemptId: payload.attemptId,
        attemptType: payload.attemptType ?? "quiz",
      },
    });
    if (existing) {
      if (existing.userId !== user.id) {
        throw new ForbiddenException("Attempt already has a proctoring session");
      }
      return existing;
    }
    const session = await this.prisma.proctoringSession.create({
      data: {
        organizationId: organization.id,
        attemptId: payload.attemptId,
        attemptType: payload.attemptType ?? "quiz",
        userId: user.id,
        status: "ACTIVE",
        metadata: (payload.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
    await this.audit(organization.id, user.id, "proctoring.session_started", session.id);
    return session;
  }

  async getSession(organizationId: string, sessionId: string) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: { id: sessionId, organizationId },
      include: {
        events: { orderBy: { occurredAt: "asc" } },
        flags: { orderBy: { createdAt: "desc" } },
        user: { select: { id: true, email: true, name: true } },
      },
    });
    if (!session) throw new NotFoundException("Session not found");
    return session;
  }

  async endSession(organizationId: string, sessionId: string, userId: string) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: { id: sessionId, organizationId },
    });
    if (!session) throw new NotFoundException("Session not found");
    const events = await this.prisma.proctoringEvent.findMany({
      where: { sessionId: session.id },
      select: { severity: true, type: true },
    });
    const integrityScore = this.provider.computeIntegrityScore(events);
    const updated = await this.prisma.proctoringSession.update({
      where: { id: session.id },
      data: {
        endedAt: new Date(),
        status: events.length === 0 ? "COMPLETED" : "REVIEWED",
        integrityScore,
      },
    });
    await this.audit(
      organizationId,
      userId,
      "proctoring.session_ended",
      session.id,
      { integrityScore, eventCount: events.length },
    );
    return updated;
  }

  async ingestEvent(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    sessionId: string,
    dto: IngestProctoringEventDto,
  ) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: { id: sessionId, organizationId: organization.id },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.userId !== user.id) {
      throw new ForbiddenException("Cannot ingest events for another user");
    }
    const event = await this.prisma.proctoringEvent.create({
      data: {
        organizationId: organization.id,
        sessionId: session.id,
        type: dto.type,
        severity: dto.severity ?? "LOW",
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
    if ((dto.severity ?? "LOW") === "HIGH") {
      await this.prisma.proctoringFlag.create({
        data: {
          organizationId: organization.id,
          sessionId: session.id,
          eventId: event.id,
          status: "OPEN",
        },
      });
      if (session.status === "ACTIVE") {
        await this.prisma.proctoringSession.update({
          where: { id: session.id },
          data: { status: "FLAGGED" },
        });
      }
    }
    return event;
  }

  async ingestBatch(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    sessionId: string,
    dto: BatchIngestProctoringEventsDto,
  ) {
    const session = await this.prisma.proctoringSession.findFirst({
      where: { id: sessionId, organizationId: organization.id },
    });
    if (!session) throw new NotFoundException("Session not found");
    if (session.userId !== user.id) {
      throw new ForbiddenException("Cannot ingest events for another user");
    }
    const created = await this.prisma.$transaction(
      dto.events.map((event) =>
        this.prisma.proctoringEvent.create({
          data: {
            organizationId: organization.id,
            sessionId: session.id,
            type: event.type,
            severity: event.severity ?? "LOW",
            metadata: (event.metadata ?? {}) as Prisma.InputJsonObject,
          },
        }),
      ),
    );
    const highSeverity = created.filter(
      (event) => event.severity === "HIGH",
    );
    if (highSeverity.length > 0) {
      await this.prisma.$transaction([
        this.prisma.proctoringFlag.createMany({
          data: highSeverity.map((event) => ({
            organizationId: organization.id,
            sessionId: session.id,
            eventId: event.id,
            status: "OPEN" as const,
          })),
        }),
        this.prisma.proctoringSession.update({
          where: { id: session.id },
          data: { status: "FLAGGED" },
        }),
      ]);
    }
    return created;
  }

  async sampleProviderEvent() {
    return this.provider.sampleEvent();
  }

  async listSessions(
    organizationId: string,
    filters: { userId?: string; status?: "ACTIVE" | "COMPLETED" | "FLAGGED" | "REVIEWED" } = {},
  ) {
    return this.prisma.proctoringSession.findMany({
      where: {
        organizationId,
        ...(filters.userId ? { userId: filters.userId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      take: 100,
      include: {
        user: { select: { id: true, email: true, name: true } },
        _count: { select: { events: true, flags: true } },
      },
      orderBy: { startedAt: "desc" },
    });
  }

  async listFlags(
    organizationId: string,
    filters: { status?: "OPEN" | "DISMISSED" | "UPHELD"; sessionId?: string } = {},
  ) {
    return this.prisma.proctoringFlag.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status } : {}),
        ...(filters.sessionId ? { sessionId: filters.sessionId } : {}),
      },
      take: 100,
      include: {
        event: true,
        session: {
          select: { id: true, userId: true, attemptId: true, attemptType: true },
        },
        reviewer: { select: { id: true, email: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async reviewFlag(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    flagId: string,
    dto: ReviewProctoringFlagDto,
  ) {
    const flag = await this.prisma.proctoringFlag.findFirst({
      where: { id: flagId, organizationId: organization.id },
    });
    if (!flag) throw new NotFoundException("Flag not found");
    const updated = await this.prisma.proctoringFlag.update({
      where: { id: flag.id },
      data: {
        status: dto.status,
        notes: dto.notes,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });
    if (dto.status !== "DISMISSED") {
      await this.prisma.proctoringSession.update({
        where: { id: flag.sessionId },
        data: { status: "REVIEWED" },
      });
    }
    await this.audit(organization.id, user.id, "proctoring.flag_reviewed", flag.id, {
      status: dto.status,
    });
    return updated;
  }

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
        entityType: "Proctoring",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
