import { describe, expect, it, vi } from "vitest";
import { CertificatePdfService } from "./certificate-pdf.service";

function certificate(overrides: Record<string, unknown> = {}) {
  return {
    id: "cert_1",
    organizationId: "org_1",
    courseId: "course_1",
    userId: "learner_1",
    verificationCode: "VERIFY123",
    certificateNumber: "CERT-2026-ABC",
    issuedAt: new Date("2026-07-05T00:00:00Z"),
    expiresAt: null,
    revokedAt: null,
    pdfStatus: "PENDING",
    pdfFileId: null,
    metadata: {},
    organization: { name: "Learning Organization" },
    course: { title: "Practical Web Foundations" },
    user: { name: "Alex Learner" },
    template: null,
    pdfFile: null,
    ...overrides,
  };
}

function setup(record = certificate()) {
  const prisma = {
    certificate: {
      findFirst: vi.fn().mockResolvedValue(record),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ ...record, ...data, pdfFile: data.pdfFileId ? { id: data.pdfFileId } : record.pdfFile })),
    },
  };
  const files = {
    createManagedFile: vi.fn().mockResolvedValue({ id: "file_1" }),
    deleteManagedFile: vi.fn().mockResolvedValue(undefined),
  };
  return { service: new CertificatePdfService(prisma as never, files as never), prisma, files };
}

describe("CertificatePdfService", () => {
  it("renders required certificate details and links the managed PDF", async () => {
    const { service, prisma, files } = setup();
    await service.ensureGenerated("org_1", "cert_1");

    expect(files.createManagedFile).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: "org_1",
      ownerId: "learner_1",
      mimeType: "application/pdf",
      purpose: "CERTIFICATE",
    }));
    const body = files.createManagedFile.mock.calls[0]![0].body as Buffer;
    expect(body.subarray(0, 4).toString()).toBe("%PDF");
    expect(body.length).toBeGreaterThan(5_000);
    expect(prisma.certificate.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ pdfFileId: "file_1", pdfStatus: "GENERATED", pdfGeneratedAt: expect.any(Date) }),
    }));
  });

  it("does not regenerate a current generated PDF", async () => {
    const record = certificate({ pdfStatus: "GENERATED", pdfFileId: "file_1", pdfFile: { id: "file_1", deletedAt: null }, metadata: { pdfCertificateStatus: "VALID" } });
    const { service, files, prisma } = setup(record);
    await service.ensureGenerated("org_1", "cert_1");
    expect(files.createManagedFile).not.toHaveBeenCalled();
    expect(prisma.certificate.update).not.toHaveBeenCalled();
  });

  it("marks generation as failed when managed storage fails", async () => {
    const { service, files, prisma } = setup();
    files.createManagedFile.mockRejectedValueOnce(new Error("storage unavailable"));
    await expect(service.ensureGenerated("org_1", "cert_1")).rejects.toThrow("Certificate PDF generation failed");
    expect(prisma.certificate.update).toHaveBeenLastCalledWith(expect.objectContaining({
      data: expect.objectContaining({ pdfStatus: "FAILED", pdfError: "storage unavailable" }),
    }));
  });
});
