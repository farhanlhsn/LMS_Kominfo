import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  ConsentCookieDto,
  CreateBackupJobDto,
  CreateLegalDocumentDto,
  CreateRetentionPolicyDto,
  RecordConsentDto,
  RequestAnonymizationDto,
  RequestDataExportDto,
  UpdateLegalDocumentDto,
  UpdateRetentionPolicyDto,
} from "./dto/governance.dto";

const ANONYMIZED_EMAIL_DOMAIN = "@anonymized.local";
const ANONYMIZED_NAME = "Anonymized User";

@Injectable()
export class GovernanceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ============================================================
  // Legal documents
  // ============================================================

  async listLegalDocuments(
    organization: OrganizationContext,
    type?: string,
  ) {
    return this.prisma.legalDocument.findMany({
      take: 100,
      where: {
        organizationId: organization.id,
        ...(type ? { type: type as Prisma.LegalDocumentWhereInput["type"] } : {}),
      },
      orderBy: [{ type: "asc" }, { effectiveAt: "desc" }],
    });
  }

  async getLatestLegalDocuments(organization: OrganizationContext) {
    const all = await this.prisma.legalDocument.findMany({
      where: { organizationId: organization.id, publishedAt: { not: null } },
      orderBy: [{ type: "asc" }, { effectiveAt: "desc" }],
      take: 200,
    });
    const latestByType = new Map<string, (typeof all)[number]>();
    for (const doc of all) {
      if (!latestByType.has(doc.type)) {
        latestByType.set(doc.type, doc);
      }
    }
    return Array.from(latestByType.values());
  }

  async createLegalDocument(
    organization: OrganizationContext,
    userId: string,
    dto: CreateLegalDocumentDto,
  ) {
    const doc = await this.prisma.legalDocument.create({
      data: {
        organizationId: organization.id,
        type: dto.type,
        version: dto.version,
        title: dto.title,
        content: dto.content,
        effectiveAt: new Date(dto.effectiveAt),
        publishedAt: dto.publish ? new Date() : null,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "legal_document.created",
      doc.id,
      { type: dto.type, version: dto.version },
    );
    return doc;
  }

  async updateLegalDocument(
    organization: OrganizationContext,
    userId: string,
    documentId: string,
    dto: UpdateLegalDocumentDto,
  ) {
    const existing = await this.prisma.legalDocument.findFirst({
      where: { id: documentId, organizationId: organization.id },
    });
    if (!existing) {
      throw new NotFoundException("Legal document not found");
    }
    const updated = await this.prisma.legalDocument.update({
      where: { id: existing.id },
      data: {
        title: dto.title,
        content: dto.content,
        effectiveAt: dto.effectiveAt ? new Date(dto.effectiveAt) : undefined,
        publishedAt:
          dto.publish === undefined
            ? undefined
            : dto.publish
              ? existing.publishedAt ?? new Date()
              : null,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "legal_document.updated",
      updated.id,
    );
    return updated;
  }

  // ============================================================
  // Consent recording
  // ============================================================

  async recordConsent(
    organization: OrganizationContext,
    userId: string,
    dto: RecordConsentDto,
  ) {
    const consent = await this.prisma.consentRecord.create({
      data: {
        userId,
        organizationId: organization.id,
        documentId: dto.documentId,
        documentType: dto.documentType,
        documentVersion: dto.documentVersion,
        granted: true,
        ipAddress: dto.ipAddress,
        userAgent: dto.userAgent,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "consent.recorded",
      consent.id,
      { type: dto.documentType, version: dto.documentVersion },
    );
    return consent;
  }

  async listMyConsents(organizationId: string, userId: string) {
    return this.prisma.consentRecord.findMany({
      where: { organizationId, userId },
      orderBy: { grantedAt: "desc" },
      take: 100,
    });
  }

  async recordCookieConsent(
    organization: OrganizationContext,
    dto: ConsentCookieDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.cookieConsent.upsert({
      where: {
        organizationId_sessionId: {
          organizationId: organization.id,
          sessionId: dto.sessionId,
        },
      },
      update: {
        necessary: dto.necessary,
        analytics: dto.analytics,
        marketing: dto.marketing,
        preferences: dto.preferences ?? false,
        ipAddress,
        userAgent,
        grantedAt: new Date(),
      },
      create: {
        organizationId: organization.id,
        sessionId: dto.sessionId,
        necessary: dto.necessary,
        analytics: dto.analytics,
        marketing: dto.marketing,
        preferences: dto.preferences ?? false,
        ipAddress,
        userAgent,
      },
    });
  }

  // ============================================================
  // Data export (mock)
  // ============================================================

  async requestDataExport(
    organization: OrganizationContext,
    userId: string,
    dto: RequestDataExportDto = {},
  ) {
    const existing = await this.prisma.dataExportRequest.findFirst({
      where: {
        organizationId: organization.id,
        userId,
        status: { in: ["PENDING", "RUNNING"] },
      },
    });
    if (existing) {
      return existing;
    }
    const request = await this.prisma.dataExportRequest.create({
      data: {
        organizationId: organization.id,
        userId,
        status: "RUNNING",
        metadata: dto.reason
          ? ({ reason: dto.reason } as Prisma.InputJsonObject)
          : Prisma.JsonNull,
      },
    });

    // Mock: build a JSON snapshot of the user data in this organization.
    const data = await this.buildUserDataSnapshot(organization.id, userId);
    const completed = await this.prisma.dataExportRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        downloadUrl: `mock://exports/${request.id}.json`,
        metadata: {
          ...(dto.reason ? { reason: dto.reason } : {}),
          recordCount: data.recordCount,
        } as Prisma.InputJsonObject,
      },
    });
    void data;
    await this.audit(
      organization.id,
      userId,
      "data_export.requested",
      completed.id,
    );
    return completed;
  }

  async previewDataExport(organization: OrganizationContext, userId: string) {
    return this.buildUserDataSnapshot(organization.id, userId);
  }

  async listDataExportRequests(
    organization: OrganizationContext,
    userId: string,
  ) {
    if (!organization.isPlatformAdmin) {
      const isMine = await this.belongsToOrganization(
        organization.id,
        userId,
      );
      if (!isMine) {
        throw new ForbiddenException("Insufficient permissions");
      }
    }
    return this.prisma.dataExportRequest.findMany({
      where: { organizationId: organization.id },
      orderBy: { requestedAt: "desc" },
      take: 100,
    });
  }

  // ============================================================
  // Anonymization (self-service)
  // ============================================================

  async requestAnonymization(
    organization: OrganizationContext,
    userId: string,
    dto: RequestAnonymizationDto = {},
  ) {
    if (!dto.confirm) {
      throw new BadRequestException(
        "Confirmation is required before anonymizing an account",
      );
    }
    const existing = await this.prisma.anonymizationRequest.findFirst({
      where: {
        organizationId: organization.id,
        userId,
        status: { in: ["PENDING", "RUNNING"] },
      },
    });
    if (existing) {
      return existing;
    }
    const request = await this.prisma.anonymizationRequest.create({
      data: {
        organizationId: organization.id,
        userId,
        status: "RUNNING",
        reason: dto.reason,
      },
    });
    await this.anonymizeUser(organization.id, userId);
    const completed = await this.prisma.anonymizationRequest.update({
      where: { id: request.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });
    await this.audit(
      organization.id,
      userId,
      "anonymization.completed",
      completed.id,
    );
    return completed;
  }

  // ============================================================
  // Retention policies
  // ============================================================

  async listRetentionPolicies(organization: OrganizationContext) {
    return this.prisma.retentionPolicy.findMany({
      where: { organizationId: organization.id },
      orderBy: { entityType: "asc" },
      take: 100,
    });
  }

  async upsertRetentionPolicy(
    organization: OrganizationContext,
    userId: string,
    dto: CreateRetentionPolicyDto | UpdateRetentionPolicyDto & { entityType?: string },
  ) {
    if (!("entityType" in dto) || !dto.entityType) {
      throw new BadRequestException("entityType is required to create a retention policy");
    }
    const policy = await this.prisma.retentionPolicy.upsert({
      where: {
        organizationId_entityType: {
          organizationId: organization.id,
          entityType: dto.entityType,
        },
      },
      update: {
        retentionDays: dto.retentionDays,
        anonymize: dto.anonymize,
        description: dto.description,
      },
      create: {
        organizationId: organization.id,
        entityType: dto.entityType,
        retentionDays: dto.retentionDays ?? 365,
        anonymize: dto.anonymize ?? true,
        description: dto.description,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "retention_policy.upserted",
      policy.id,
      { entityType: policy.entityType },
    );
    return policy;
  }

  // ============================================================
  // Backup jobs
  // ============================================================

  async listBackupJobs(organization: OrganizationContext) {
    return this.prisma.backupJob.findMany({
      where: { organizationId: organization.id },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async triggerBackupJob(
    organization: OrganizationContext,
    userId: string,
    dto: CreateBackupJobDto,
  ) {
    const job = await this.prisma.backupJob.create({
      data: {
        organizationId: organization.id,
        type: dto.type,
        status: "PENDING",
        notes: dto.notes,
        triggeredBy: userId,
      },
    });
    // Mock: pretend to run the backup. In production this would enqueue
    // a BullMQ job; here we synchronously mark it completed with a
    // fabricated size and location.
    const sizeBytes = BigInt(dto.type === "FULL" ? 1024 * 1024 * 256 : 1024 * 1024 * 32);
    const completed = await this.prisma.backupJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
        sizeBytes,
        location: `mock://backups/${organization.id}/${job.id}.zip`,
      },
    });
    await this.audit(
      organization.id,
      userId,
      "backup_job.triggered",
      completed.id,
      { type: dto.type },
    );
    return completed;
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async buildUserDataSnapshot(organizationId: string, userId: string) {
    const [
      enrollments,
      activityProgress,
      learnerNotes,
      learnerBookmarks,
      goals,
      submissions,
      quizAttempts,
      consents,
      xpTransactions,
    ] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { organizationId, userId },
        select: {
          id: true,
          courseId: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.activityProgress.findMany({
        where: { organizationId, userId },
        select: { id: true, activityId: true, status: true, updatedAt: true },
      }),
      this.prisma.learnerNote.findMany({
        where: { organizationId, userId },
        select: { id: true, lessonId: true, content: true, createdAt: true },
      }),
      this.prisma.learnerBookmark.findMany({
        where: { organizationId, userId },
        select: { id: true, lessonId: true, createdAt: true },
      }),
      this.prisma.learningGoal.findMany({
        where: { userId },
        select: { id: true, title: true, status: true },
      }),
      this.prisma.assignmentSubmission.findMany({
        where: { organizationId, userId },
        select: { id: true, assignmentId: true, status: true, submittedAt: true },
      }),
      this.prisma.quizAttempt.findMany({
        where: { organizationId, userId },
        select: { id: true, quizId: true, status: true, score: true, startedAt: true },
      }),
      this.prisma.consentRecord.findMany({
        where: { organizationId, userId },
        select: { documentType: true, documentVersion: true, grantedAt: true },
      }),
      this.prisma.xpTransaction.findMany({
        where: { userId },
        select: { id: true, amount: true, reason: true, createdAt: true },
      }),
    ]);

    const recordCount =
      enrollments.length +
      activityProgress.length +
      learnerNotes.length +
      learnerBookmarks.length +
      goals.length +
      submissions.length +
      quizAttempts.length +
      consents.length +
      xpTransactions.length;

    return {
      organizationId,
      userId,
      generatedAt: new Date().toISOString(),
      recordCount,
      enrollments,
      activityProgress,
      learnerNotes,
      learnerBookmarks,
      learningGoals: goals,
      assignmentSubmissions: submissions,
      quizAttempts,
      consents,
      xpTransactions,
    };
  }

  private async anonymizeUser(organizationId: string, userId: string) {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
    });
    if (!member) {
      throw new NotFoundException("Membership not found for this user");
    }
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const anonymizedEmail = `anon-${userId}${ANONYMIZED_EMAIL_DOMAIN}`;
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: {
          email: anonymizedEmail,
          name: ANONYMIZED_NAME,
          passwordHash: null,
          status: "DEACTIVATED",
        },
      });
      await tx.organizationMember.update({
        where: { id: member.id },
        data: { status: "DEACTIVATED" },
      });
      // Drop active sessions for the user within this organization.
      await tx.userSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date(), revokedReason: "anonymization" },
      });
      await tx.refreshSession.updateMany({
        where: { userId },
        data: { revokedAt: new Date() },
      });
      await tx.mfaFactor.deleteMany({ where: { userId } });
      await tx.oAuthAccount.deleteMany({ where: { userId } });
    });
  }

  private async belongsToOrganization(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await this.prisma.organizationMember.findFirst({
      where: { organizationId, userId },
    });
    return Boolean(member);
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
        entityType: "Governance",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
