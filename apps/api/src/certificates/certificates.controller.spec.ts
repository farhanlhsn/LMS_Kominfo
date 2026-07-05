import { describe, expect, it, vi } from "vitest";
import {
  AdminCertificateTemplatesController,
  InstructorCertificatesController,
  LearnerCertificatesController,
  PublicCertificateVerificationController,
} from "./certificates.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: ["certificates:manage", "certificates:issue"], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "T", sessionId: "s-1", role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const service = {
    listTemplates: vi.fn().mockResolvedValue([{ id: "t-1", name: "Default" }]),
    createTemplate: vi.fn().mockResolvedValue({ id: "t-1", name: "New" }),
    getTemplate: vi.fn().mockResolvedValue({ id: "t-1", name: "Default" }),
    updateTemplate: vi.fn().mockResolvedValue({ id: "t-1", name: "Updated" }),
    deleteTemplate: vi.fn().mockResolvedValue({ id: "t-1", status: "ARCHIVED" }),
    listCourseCertificates: vi.fn().mockResolvedValue([{ id: "c-1" }]),
    issue: vi.fn().mockResolvedValue({ id: "c-1", certificateNumber: "CERT-1" }),
    revoke: vi.fn().mockResolvedValue({ id: "c-1", revokedAt: new Date() }),
    regeneratePdf: vi.fn().mockResolvedValue({ id: "c-1", pdfStatus: "READY" }),
    managedDownload: vi.fn().mockResolvedValue({ url: "https://signed.example/c-1", expiresInSeconds: 300 }),
    learnerCertificates: vi.fn().mockResolvedValue([{ id: "c-1" }]),
    learnerCertificate: vi.fn().mockResolvedValue({ id: "c-1" }),
    learnerDownload: vi.fn().mockResolvedValue({ url: "https://signed.example/c-1", expiresInSeconds: 300 }),
    verify: vi.fn().mockResolvedValue({ id: "c-1", status: "VALID" }),
    ...overrides,
  };
  return {
    service,
    admin: new AdminCertificateTemplatesController(service as any),
    instructor: new InstructorCertificatesController(service as any),
    learner: new LearnerCertificatesController(service as any),
    public: new PublicCertificateVerificationController(service as any),
  };
}

describe("AdminCertificateTemplatesController", () => {
  it("lists templates for the organization", async () => {
    const { admin, service } = setup();
    const response = await admin.list(org);
    expect(service.listTemplates).toHaveBeenCalledWith(org);
    expect(response).toEqual([{ id: "t-1", name: "Default" }]);
  });

  it("creates a template", async () => {
    const { admin, service } = setup();
    const response = await admin.create(org, user, { name: "New" } as any);
    expect(service.createTemplate).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ name: "New" }));
    expect(response).toEqual({ id: "t-1", name: "New" });
  });

  it("gets a template by id", async () => {
    const { admin, service } = setup();
    const response = await admin.get(org, "t-1");
    expect(service.getTemplate).toHaveBeenCalledWith(org, "t-1");
    expect(response).toEqual({ id: "t-1", name: "Default" });
  });

  it("updates a template", async () => {
    const { admin, service } = setup();
    const response = await admin.update(org, "t-1", { name: "Updated" } as any);
    expect(service.updateTemplate).toHaveBeenCalledWith(org, "t-1", expect.objectContaining({ name: "Updated" }));
    expect(response).toEqual({ id: "t-1", name: "Updated" });
  });

  it("deletes a template", async () => {
    const { admin, service } = setup();
    const response = await admin.delete(org, "t-1");
    expect(service.deleteTemplate).toHaveBeenCalledWith(org, "t-1");
    expect(response).toEqual({ id: "t-1", status: "ARCHIVED" });
  });
});

describe("InstructorCertificatesController", () => {
  it("lists course certificates", async () => {
    const { instructor, service } = setup();
    const response = await instructor.list(org, user, "course-1");
    expect(service.listCourseCertificates).toHaveBeenCalledWith(org, "u-1", "course-1");
    expect(response).toEqual([{ id: "c-1" }]);
  });

  it("issues a certificate for a learner", async () => {
    const { instructor, service } = setup();
    const response = await instructor.issue(org, user, "course-1", { userId: "learner-1" } as any);
    expect(service.issue).toHaveBeenCalledWith(org, "u-1", "course-1", expect.objectContaining({ userId: "learner-1" }));
    expect(response).toEqual({ id: "c-1", certificateNumber: "CERT-1" });
  });

  it("revokes a certificate", async () => {
    const { instructor, service } = setup();
    const response = await instructor.revoke(org, user, "c-1", { reason: "misconduct" } as any);
    expect(service.revoke).toHaveBeenCalledWith(org, "u-1", "c-1", expect.objectContaining({ reason: "misconduct" }));
    expect(response).toEqual({ id: "c-1", revokedAt: expect.any(Date) });
  });

  it("regenerates a PDF", async () => {
    const { instructor, service } = setup();
    const response = await instructor.generatePdf(org, user, "c-1");
    expect(service.regeneratePdf).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ id: "c-1", pdfStatus: "READY" });
  });

  it("downloads a managed certificate URL", async () => {
    const { instructor, service } = setup();
    const response = await instructor.download(org, user, "c-1");
    expect(service.managedDownload).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ url: "https://signed.example/c-1", expiresInSeconds: 300 });
  });
});

describe("LearnerCertificatesController", () => {
  it("lists the learner's own certificates", async () => {
    const { learner, service } = setup();
    const response = await learner.list(org, user);
    expect(service.learnerCertificates).toHaveBeenCalledWith("org-a", "u-1");
    expect(response).toEqual([{ id: "c-1" }]);
  });

  it("gets a learner certificate", async () => {
    const { learner, service } = setup();
    const response = await learner.get(org, user, "c-1");
    expect(service.learnerCertificate).toHaveBeenCalledWith("org-a", "u-1", "c-1");
    expect(response).toEqual({ id: "c-1" });
  });

  it("downloads the certificate as a learner", async () => {
    const { learner, service } = setup();
    const response = await learner.download(org, user, "c-1");
    expect(service.learnerDownload).toHaveBeenCalledWith(org, "u-1", "c-1");
    expect(response).toEqual({ url: "https://signed.example/c-1", expiresInSeconds: 300 });
  });
});

describe("PublicCertificateVerificationController", () => {
  it("verifies a certificate by verification code", async () => {
    const { public: pub, service } = setup();
    const response = await pub.verify("VERIFY-1");
    expect(service.verify).toHaveBeenCalledWith("VERIFY-1");
    expect(response).toEqual({ id: "c-1", status: "VALID" });
  });
});
