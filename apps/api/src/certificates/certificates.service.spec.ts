import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CertificatesService } from "./certificates.service";

const organization = { id: "org_1", isPlatformAdmin: false, permissionKeys: [], roleKeys: [], memberId: "member_1", name: "Org", slug: "org" };

function setup() {
  const prisma = {
    certificate: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    course: { findFirst: vi.fn() },
    courseInstructor: { findFirst: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  const pdf = { ensureGenerated: vi.fn() };
  const files = { managedSignedUrl: vi.fn().mockResolvedValue({ url: "https://signed.example/certificate", expiresInSeconds: 300 }) };
  return { service: new CertificatesService(prisma as never, pdf as never, files as never), prisma, pdf, files };
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
