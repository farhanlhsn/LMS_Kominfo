import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createTransport = vi.fn();
const sendMail = vi.fn();

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (...args: unknown[]) => createTransport(...args),
  },
}));

describe("EmailService", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    createTransport.mockReset();
    sendMail.mockReset();
    createTransport.mockReturnValue({ sendMail });
    process.env = { ...env };
    delete process.env.SMTP_HOST;
    delete process.env.SMTP_USER;
    delete process.env.SMTP_PASS;
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("skips send when SMTP is not configured", async () => {
    const { EmailService } = await import("./email.service");
    const service = new EmailService({} as any);
    await service.sendPasswordReset("a@b.c", "A", "http://reset");
    await service.sendOrganizationInvite("a@b.c", "Admin", "Org", "http://login", "hi");
    await service.sendWelcome("a@b.c", null, "Org", "http://login");
    expect(createTransport).not.toHaveBeenCalled();
  });

  it("sends mail when SMTP is configured", async () => {
    process.env.SMTP_HOST = "smtp.example";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "u";
    process.env.SMTP_PASS = "p";
    process.env.SMTP_FROM = "LMS <noreply@example.com>";
    sendMail.mockResolvedValue({});
    const { EmailService } = await import("./email.service");
    const service = new EmailService({} as any);
    expect(createTransport).toHaveBeenCalled();
    await service.sendPasswordReset("a@b.c", null, "http://reset");
    await service.sendOrganizationInvite("a@b.c", "Admin", "Org", "http://login");
    await service.sendWelcome("a@b.c", "A", "Org", "http://login");
    expect(sendMail).toHaveBeenCalledTimes(3);
  });

  it("swallows send failures", async () => {
    process.env.SMTP_HOST = "smtp.example";
    process.env.SMTP_USER = "u";
    process.env.SMTP_PASS = "p";
    sendMail.mockRejectedValue(new Error("smtp down"));
    const { EmailService } = await import("./email.service");
    const service = new EmailService({} as any);
    await expect(
      service.sendPasswordReset("a@b.c", "A", "http://reset"),
    ).resolves.toBeUndefined();
  });
});
