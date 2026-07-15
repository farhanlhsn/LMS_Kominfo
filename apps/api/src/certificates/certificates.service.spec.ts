import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CertificatesService } from "./certificates.service";

const organization = { id: "org_1", isPlatformAdmin: false, permissionKeys: [], roleKeys: [], memberId: "member_1", name: "Org", slug: "org" };

function setup() {
  const prisma = {
    certificate: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn().mockResolvedValue([{ id: "cert_1" }]),
      upsert: vi.fn().mockResolvedValue({
        id: "cert_1",
        userId: "learner_1",
        courseId: "course_1",
        course: { title: "Course" },
      }),
      update: vi.fn().mockResolvedValue({ id: "cert_1", revokedAt: new Date() }),
      count: vi.fn().mockResolvedValue(0),
    },
    certificateTemplate: {
      findFirst: vi.fn().mockResolvedValue({
        id: "tpl_1",
        organizationId: "org_1",
        status: "ACTIVE",
        deletedAt: null,
      }),
      create: vi.fn().mockResolvedValue({ id: "tpl_1" }),
      update: vi.fn().mockResolvedValue({ id: "tpl_1" }),
    },
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course_1" }) },
    courseInstructor: { findFirst: vi.fn().mockResolvedValue({ id: "ci" }) },
    enrollment: {
      findUnique: vi.fn().mockResolvedValue({
        id: "e1",
        progressPercent: 100,
      }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const pdf = {
    ensureGenerated: vi.fn().mockResolvedValue({
      id: "cert_1",
      pdfFileId: "file_1",
      course: { title: "Course" },
      userId: "learner_1",
      courseId: "course_1",
    }),
  };
  const files = {
    managedSignedUrl: vi
      .fn()
      .mockResolvedValue({
        url: "https://signed.example/certificate",
        expiresInSeconds: 300,
      }),
  };
  const notifications = { createForUser: vi.fn().mockResolvedValue(undefined) };
  return {
    service: new CertificatesService(
      prisma as never,
      pdf as never,
      files as never,
      notifications as never,
    ),
    prisma,
    pdf,
    files,
    notifications,
  };
}

describe("CertificatesService access and verification", () => {
  it("allows a learner to download only their tenant-scoped certificate", async () => {
    const { service, prisma, pdf, files } = setup();
    prisma.certificate.findFirst.mockResolvedValueOnce({ id: "cert_1" });
    pdf.ensureGenerated.mockResolvedValue({ id: "cert_1", pdfFileId: "file_1" });
    await expect(service.learnerDownload(organization as never, "learner_1", "cert_1")).resolves.toEqual({
      url: "https://signed.example/certificate",
      expiresInSeconds: 300,
    });
    expect(prisma.certificate.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "cert_1", organizationId: "org_1", userId: "learner_1" },
    }));
    expect(files.managedSignedUrl).toHaveBeenCalledWith("org_1", "file_1");
  });

  it("blocks another learner and cross-tenant certificate lookup", async () => {
    const { service, prisma, pdf } = setup();
    prisma.certificate.findFirst.mockResolvedValue(null);
    await expect(service.learnerDownload(organization as never, "other_learner", "cert_1")).rejects.toBeInstanceOf(NotFoundException);
    expect(pdf.ensureGenerated).not.toHaveBeenCalled();
  });

  it.each([
    [null, null, "VALID"],
    [new Date("2026-01-01"), null, "REVOKED"],
    [null, new Date("2020-01-01"), "EXPIRED"],
  ])("returns public-safe %s certificate state as %s", async (revokedAt, expiresAt, status) => {
    const { service, prisma } = setup();
    prisma.certificate.findUnique.mockResolvedValue({
      id: "cert_1", certificateNumber: "CERT-1", verificationCode: "CODE", issuedAt: new Date("2026-01-01"),
      expiresAt, revokedAt, course: { title: "Course" }, organization: { name: "Organization" }, user: { name: "Learner" }, template: null,
    });
    const result = await service.verify("CODE");
    expect(result.status).toBe(status);
    expect(result).not.toHaveProperty("pdfFileId");
    expect(result).not.toHaveProperty("revokeReason");
  });
});

describe("CertificatesService issue and revoke", () => {
  it("lists issues and revokes certificates", async () => {
    const { service, prisma, notifications } = setup();
    const org = {
      id: "org_1",
      isPlatformAdmin: true,
      permissionKeys: ["certificates:issue"],
      roleKeys: ["instructor"],
      memberId: "m1",
      name: "Org",
      slug: "org",
    } as any;

    expect(await service.listCourseCertificates(org, "u1", "course_1")).toEqual([
      { id: "cert_1" },
    ]);

    await service.issue(org, "issuer", "course_1", {
      userId: "learner_1",
    } as any);
    expect(notifications.createForUser).toHaveBeenCalled();

    prisma.certificate.findFirst.mockResolvedValue({
      id: "cert_1",
      organizationId: "org_1",
      courseId: "course_1",
    });
    await service.revoke(org, "issuer", "cert_1", {
      reason: "fraud",
    } as any);
    expect(prisma.certificate.update).toHaveBeenCalled();

    await service.createTemplate(org, "issuer", {
      name: "Default",
      status: "ACTIVE",
    } as any);
    await service.getTemplate(org, "tpl_1");
    await service.updateTemplate(org, "tpl_1", { name: "Default 2" } as any);
    await service.deleteTemplate(org, "tpl_1");

    prisma.certificate.findFirst.mockResolvedValue({
      id: "cert_1",
      organizationId: "org_1",
      courseId: "course_1",
      userId: "learner_1",
      pdfFileId: "file_1",
    });
    await service.managedDownload(org, "issuer", "cert_1");
    await service.regeneratePdf(org, "issuer", "cert_1");
    await service.learnerCertificates("org_1", "learner_1");
    await service.learnerCertificate("org_1", "learner_1", "cert_1");
  });

  it("auto-issues when enrollment is complete and template is valid", async () => {
    const { service, prisma, notifications, pdf } = setup();
    prisma.course.findFirst.mockResolvedValue({
      id: "course_1",
      autoCertificate: true,
      autoCertificateTemplateId: "tpl_1",
      title: "Course",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      progressPercent: 100,
      status: "COMPLETED",
    });
    prisma.certificate.findUnique.mockResolvedValue(null);
    prisma.certificateTemplate.findFirst.mockResolvedValue({
      id: "tpl_1",
      organizationId: "org_1",
      status: "ACTIVE",
      deletedAt: null,
    });
    prisma.certificate.count.mockResolvedValue(0);
    prisma.certificate.findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "cert_1",
      course: { title: "Course" },
      courseId: "course_1",
    });
    pdf.ensureGenerated.mockResolvedValue({
      id: "cert_1",
      pdfFileId: "file_1",
      course: { title: "Course" },
      courseId: "course_1",
      userId: "learner_1",
    });
    const result = await service.autoIssue("org_1", "learner_1", "course_1");
    expect(result).toMatchObject({ id: "cert_1" });
    expect(notifications.createForUser).toHaveBeenCalled();
  });

  it("skips auto-issue when enrollment incomplete or cert already valid", async () => {
    const { service, prisma } = setup();
    prisma.course.findFirst.mockResolvedValue({
      id: "course_1",
      autoCertificate: true,
      title: "Course",
    });
    prisma.enrollment.findUnique.mockResolvedValue({ progressPercent: 50 });
    expect(await service.autoIssue("org_1", "learner_1", "course_1")).toBeNull();

    prisma.enrollment.findUnique.mockResolvedValue({ progressPercent: 100 });
    prisma.certificate.findUnique.mockResolvedValue({
      id: "cert_1",
      revokedAt: null,
    });
    expect(await service.autoIssue("org_1", "learner_1", "course_1")).toMatchObject({
      id: "cert_1",
    });
  });

  it("allows instructor issue when certificates:issue permission missing but instructor", async () => {
    const { service, prisma, notifications } = setup();
    const instructorOrg = {
      id: "org_1",
      isPlatformAdmin: false,
      permissionKeys: [],
      roleKeys: ["instructor"],
      memberId: "m1",
      name: "Org",
      slug: "org",
    } as any;
    prisma.course.findFirst.mockResolvedValue({ id: "course_1" });
    prisma.courseInstructor.findFirst.mockResolvedValue({ id: "ci-1" });
    prisma.enrollment.findUnique.mockResolvedValue({ progressPercent: 100 });
    prisma.certificate.count.mockResolvedValue(0);
    prisma.certificate.findUniqueOrThrow = vi.fn().mockResolvedValue({
      id: "cert_1",
      course: { title: "Course" },
      courseId: "course_1",
      userId: "learner_1",
    });
    await service.issue(instructorOrg, "issuer", "course_1", {
      userId: "learner_1",
    } as any);
    expect(notifications.createForUser).toHaveBeenCalled();
  });

  it("rejects issue when learner incomplete or template inactive", async () => {
    const { service, prisma } = setup();
    const org = {
      id: "org_1",
      isPlatformAdmin: true,
      permissionKeys: ["certificates:issue"],
      roleKeys: ["instructor"],
      memberId: "m1",
      name: "Org",
      slug: "org",
    } as any;
    prisma.enrollment.findUnique.mockResolvedValue({ progressPercent: 40 });
    await expect(
      service.issue(org, "issuer", "course_1", { userId: "learner_1" } as any),
    ).rejects.toThrow(/completion/i);
    prisma.enrollment.findUnique.mockResolvedValue({ progressPercent: 100 });
    prisma.certificateTemplate.findFirst.mockResolvedValue({
      id: "tpl_1",
      organizationId: "org_1",
      status: "DRAFT",
      deletedAt: null,
    });
    await expect(
      service.issue(org, "issuer", "course_1", {
        userId: "learner_1",
        templateId: "tpl_1",
      } as any),
    ).rejects.toThrow(/active/i);
  });

  it("lists templates, retries unique numbers, pdf fail paths, forbids non-instructor", async () => {
    const { service, prisma, pdf } = setup();
    const org = {
      id: "org_1",
      isPlatformAdmin: true,
      permissionKeys: ["certificates:issue"],
      roleKeys: ["instructor"],
      memberId: "m1",
      name: "Org",
      slug: "org",
    } as any;
    prisma.certificateTemplate.findMany = vi
      .fn()
      .mockResolvedValue([{ id: "tpl_1" }]);
    expect(await service.listTemplates(org)).toEqual([{ id: "tpl_1" }]);

    prisma.certificate.findUnique
      .mockResolvedValueOnce({ id: "dup" })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "dup-code" })
      .mockResolvedValueOnce(null);
    prisma.enrollment.findUnique.mockResolvedValue({ progressPercent: 100 });
    prisma.certificateTemplate.findFirst.mockResolvedValue({
      id: "tpl_1",
      status: "ACTIVE",
      deletedAt: null,
    });
    pdf.ensureGenerated.mockRejectedValueOnce(new Error("pdf"));
    prisma.certificate.findUniqueOrThrow.mockResolvedValue({
      id: "cert_1",
      course: { title: "Course" },
      courseId: "course_1",
      userId: "learner_1",
    });
    await service.issue(org, "issuer", "course_1", {
      userId: "learner_1",
      expiresAt: "2030-01-01",
    } as any);
    expect(prisma.certificate.findUnique).toHaveBeenCalled();

    prisma.certificate.findFirst.mockResolvedValue({
      id: "cert_1",
      organizationId: "org_1",
      courseId: "course_1",
    });
    pdf.ensureGenerated.mockRejectedValueOnce(new Error("pdf"));
    await service.revoke(org, "issuer", "cert_1", { reason: "x" } as any);

    prisma.course.findFirst.mockResolvedValue({
      id: "course_1",
      autoCertificate: true,
      autoCertificateTemplateId: "tpl_1",
      title: "Course",
    });
    prisma.enrollment.findUnique.mockResolvedValue({
      progressPercent: 100,
      status: "COMPLETED",
    });
    prisma.certificate.findUnique.mockResolvedValue(null);
    pdf.ensureGenerated.mockRejectedValueOnce(new Error("pdf"));
    await service.autoIssue("org_1", "learner_1", "course_1");

    const forbiddenOrg = {
      ...org,
      isPlatformAdmin: false,
      permissionKeys: [],
    };
    prisma.course.findFirst.mockResolvedValue({ id: "course_1" });
    prisma.courseInstructor.findFirst.mockResolvedValue(null);
    await expect(
      service.issue(forbiddenOrg, "outsider", "course_1", {
        userId: "learner_1",
      } as any),
    ).rejects.toThrow(/permission/i);
  });
});



