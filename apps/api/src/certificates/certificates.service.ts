import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { NotificationService } from "../engagement/notification.service";
import { FilesService } from "../files/files.service";
import { CertificatePdfService } from "./certificate-pdf.service";
import type {
  CreateCertificateTemplateDto,
  IssueCertificateDto,
  RevokeCertificateDto,
  UpdateCertificateTemplateDto,
} from "./dto/certificate.dto";

@Injectable()
export class CertificatesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CertificatePdfService) private readonly certificatePdf: CertificatePdfService,
    @Inject(FilesService) private readonly files: FilesService,
    @Optional() @Inject(NotificationService) private readonly notifications?: NotificationService,
  ) {}

  listTemplates(organization: OrganizationContext) {
    return this.prisma.certificateTemplate.findMany({
      where: { organizationId: organization.id, deletedAt: null },
      orderBy: { updatedAt: "desc" },
      take: 100,
    });
  }

  createTemplate(
    organization: OrganizationContext,
    userId: string,
    dto: CreateCertificateTemplateDto,
  ) {
    return this.prisma.certificateTemplate.create({
      data: {
        organizationId: organization.id,
        createdById: userId,
        name: dto.name,
        description: dto.description,
        design: (dto.design ?? {}) as Prisma.InputJsonObject,
        status: dto.status ?? "DRAFT",
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async getTemplate(organization: OrganizationContext, templateId: string) {
    const template = await this.prisma.certificateTemplate.findFirst({
      where: { id: templateId, organizationId: organization.id, deletedAt: null },
    });
    if (!template) throw new NotFoundException("Certificate template not found");
    return template;
  }

  async updateTemplate(
    organization: OrganizationContext,
    templateId: string,
    dto: UpdateCertificateTemplateDto,
  ) {
    await this.getTemplate(organization, templateId);
    return this.prisma.certificateTemplate.update({
      where: { id: templateId },
      data: {
        name: dto.name,
        description: dto.description,
        design: dto.design as Prisma.InputJsonObject | undefined,
        status: dto.status,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async deleteTemplate(organization: OrganizationContext, templateId: string) {
    await this.getTemplate(organization, templateId);
    return this.prisma.certificateTemplate.update({
      where: { id: templateId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  }

  async listCourseCertificates(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    return this.prisma.certificate.findMany({
      where: { organizationId: organization.id, courseId },
      include: { user: true, course: true, template: true },
      orderBy: { issuedAt: "desc" },
      take: 200,
    });
  }

  async issue(
    organization: OrganizationContext,
    issuerId: string,
    courseId: string,
    dto: IssueCertificateDto,
  ) {
    await this.ensureCanManageCourse(organization, issuerId, courseId);
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_courseId_userId: {
          organizationId: organization.id,
          courseId,
          userId: dto.userId,
        },
      },
    });
    if (!enrollment) throw new ForbiddenException("Learner is not enrolled");
    if (enrollment.progressPercent < 100) {
      throw new BadRequestException("Course completion is required before issuing a certificate");
    }
    if (dto.templateId) {
      const template = await this.getTemplate(organization, dto.templateId);
      if (template.status !== "ACTIVE") {
        throw new BadRequestException("Certificate template must be active");
      }
    }
    const certificate = await this.prisma.certificate.upsert({
      where: {
        organizationId_courseId_userId: {
          organizationId: organization.id,
          courseId,
          userId: dto.userId,
        },
      },
      update: {
        templateId: dto.templateId,
        expiresAt: this.date(dto.expiresAt),
        revokedAt: null,
        revokedById: null,
        revokeReason: null,
        pdfStatus: "PENDING",
        pdfError: null,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
      create: {
        organizationId: organization.id,
        courseId,
        userId: dto.userId,
        templateId: dto.templateId,
        certificateNumber: await this.uniqueCertificateNumber(organization.id),
        verificationCode: await this.uniqueVerificationCode(),
        expiresAt: this.date(dto.expiresAt),
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
      include: { user: true, course: true, template: true },
    });
    await this.audit(organization.id, issuerId, "certificate.issued", certificate.id);
    let result: typeof certificate;
    try {
      result = await this.certificatePdf.ensureGenerated(organization.id, certificate.id);
    } catch {
      result = await this.prisma.certificate.findUniqueOrThrow({
        where: { id: certificate.id },
        include: { user: true, course: true, template: true },
      });
    }
    await this.notifications?.createForUser({
      organizationId: organization.id,
      userId: certificate.userId,
      type: "certificate_issued",
      title: "Certificate issued",
      body: `Your certificate for ${certificate.course.title} has been issued.`,
      actionUrl: `/learn/certificates`,
      entityType: "certificate",
      entityId: certificate.id,
      metadata: { courseId: certificate.courseId },
    });
    return result;
  }

  async revoke(
    organization: OrganizationContext,
    userId: string,
    certificateId: string,
    dto: RevokeCertificateDto,
  ) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, organizationId: organization.id },
    });
    if (!certificate) throw new NotFoundException("Certificate not found");
    await this.ensureCanManageCourse(organization, userId, certificate.courseId);
    const revoked = await this.prisma.certificate.update({
      where: { id: certificateId },
      data: {
        revokedAt: new Date(),
        revokedById: userId,
        revokeReason: dto.reason,
      },
    });
    await this.audit(organization.id, userId, "certificate.revoked", certificateId);
    try {
      await this.certificatePdf.ensureGenerated(organization.id, certificateId, true);
    } catch {
      // Revocation remains authoritative even if its updated PDF cannot be rendered.
    }
    return revoked;
  }

  async learnerDownload(organization: OrganizationContext, userId: string, certificateId: string) {
    await this.learnerCertificate(organization.id, userId, certificateId);
    const certificate = await this.certificatePdf.ensureGenerated(organization.id, certificateId);
    if (!certificate.pdfFileId) throw new NotFoundException("Certificate PDF is not available");
    await this.audit(organization.id, userId, "certificate.downloaded", certificateId);
    return this.files.managedSignedUrl(organization.id, certificate.pdfFileId);
  }

  async managedDownload(organization: OrganizationContext, userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, organizationId: organization.id },
    });
    if (!certificate) throw new NotFoundException("Certificate not found");
    await this.ensureCanManageCourse(organization, userId, certificate.courseId);
    const generated = await this.certificatePdf.ensureGenerated(organization.id, certificateId);
    if (!generated.pdfFileId) throw new NotFoundException("Certificate PDF is not available");
    await this.audit(organization.id, userId, "certificate.downloaded", certificateId);
    return this.files.managedSignedUrl(organization.id, generated.pdfFileId);
  }

  async regeneratePdf(organization: OrganizationContext, userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({ where: { id: certificateId, organizationId: organization.id } });
    if (!certificate) throw new NotFoundException("Certificate not found");
    await this.ensureCanManageCourse(organization, userId, certificate.courseId);
    const generated = await this.certificatePdf.ensureGenerated(organization.id, certificateId, true);
    await this.audit(organization.id, userId, "certificate.pdf_regenerated", certificateId);
    return generated;
  }

  learnerCertificates(organizationId: string, userId: string) {
    return this.prisma.certificate.findMany({
      where: { organizationId, userId },
      include: { course: true, template: true },
      orderBy: { issuedAt: "desc" },
      take: 100,
    });
  }

  /**
   * Automatically issue a certificate when a course is completed by a learner.
   * Only issues when the course has autoCertificate=true and the learner does
   * not already have an active (non-revoked) certificate for this course.
   * This method is safe to call repeatedly — it is idempotent.
   */
  async autoIssue(organizationId: string, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId, deletedAt: null, autoCertificate: true },
    });
    if (!course) return null;

    // Validate enrollment is truly 100%
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
    });
    if (!enrollment || enrollment.progressPercent < 100) return null;

    // Skip if a valid (non-revoked) certificate already exists
    const existing = await this.prisma.certificate.findUnique({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
    });
    if (existing && !existing.revokedAt) return existing;

    // Validate template if configured
    if (course.autoCertificateTemplateId) {
      const template = await this.prisma.certificateTemplate.findFirst({
        where: { id: course.autoCertificateTemplateId, organizationId, deletedAt: null },
      });
      if (!template || template.status !== "ACTIVE") return null;
    }

    const certificate = await this.prisma.certificate.upsert({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
      update: {
        templateId: course.autoCertificateTemplateId ?? null,
        revokedAt: null,
        revokedById: null,
        revokeReason: null,
        pdfStatus: "PENDING",
        pdfError: null,
      },
      create: {
        organizationId,
        courseId,
        userId,
        templateId: course.autoCertificateTemplateId ?? null,
        certificateNumber: await this.uniqueCertificateNumber(organizationId),
        verificationCode: await this.uniqueVerificationCode(),
        metadata: {},
      },
      include: { user: true, course: true, template: true },
    });

    await this.audit(organizationId, userId, "certificate.auto_issued", certificate.id);

    let result: typeof certificate;
    try {
      result = await this.certificatePdf.ensureGenerated(organizationId, certificate.id);
    } catch {
      result = await this.prisma.certificate.findUniqueOrThrow({
        where: { id: certificate.id },
        include: { user: true, course: true, template: true },
      });
    }

    await this.notifications?.createForUser({
      organizationId,
      userId,
      type: "certificate_issued",
      title: "Certificate issued",
      body: `Your certificate for ${certificate.course.title} has been issued.`,
      actionUrl: `/learn/certificates`,
      entityType: "certificate",
      entityId: certificate.id,
      metadata: { courseId: certificate.courseId, autoIssued: true },
    });

    return result;
  }

  async learnerCertificate(organizationId: string, userId: string, certificateId: string) {
    const certificate = await this.prisma.certificate.findFirst({
      where: { id: certificateId, organizationId, userId },
      include: { course: true, template: true },
    });
    if (!certificate) throw new NotFoundException("Certificate not found");
    return certificate;
  }

  async verify(verificationCode: string) {
    const certificate = await this.prisma.certificate.findUnique({
      where: { verificationCode },
      include: {
        organization: true,
        course: true,
        user: true,
        template: true,
      },
    });
    if (!certificate) throw new NotFoundException("Certificate not found");
    const now = Date.now();
    const status = certificate.revokedAt
      ? "REVOKED"
      : certificate.expiresAt && certificate.expiresAt.getTime() < now
        ? "EXPIRED"
        : "VALID";
    return {
      id: certificate.id,
      certificateNumber: certificate.certificateNumber,
      verificationCode: certificate.verificationCode,
      status,
      issuedAt: certificate.issuedAt,
      expiresAt: certificate.expiresAt,
      revokedAt: certificate.revokedAt,
      learnerName: certificate.user.name,
      courseTitle: certificate.course.title,
      organizationName: certificate.organization.name,
      templateName: certificate.template?.name ?? null,
    };
  }

  private async ensureCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: organization.id, deletedAt: null },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (
      organization.isPlatformAdmin ||
      organization.permissionKeys.includes("certificates:issue") ||
      organization.permissionKeys.includes("courses:update")
    ) {
      return course;
    }
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: { organizationId: organization.id, courseId, userId },
    });
    if (!instructor) throw new ForbiddenException("Insufficient course permissions");
    return course;
  }

  private async uniqueCertificateNumber(organizationId: string) {
    const build = () =>
      `CERT-${new Date().getUTCFullYear()}-${randomBytes(5).toString("hex").toUpperCase()}`;
    let value = build();
    while (await this.prisma.certificate.findUnique({ where: { certificateNumber: value } })) {
      value = build();
    }
    return value;
  }

  private async uniqueVerificationCode() {
    const build = () => randomBytes(12).toString("hex").toUpperCase();
    let value = build();
    while (await this.prisma.certificate.findUnique({ where: { verificationCode: value } })) {
      value = build();
    }
    return value;
  }

  private date(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Certificate",
        entityId,
        metadata: {},
      },
    });
  }
}
