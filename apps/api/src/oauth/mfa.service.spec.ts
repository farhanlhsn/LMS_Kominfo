import { NotFoundException, UnauthorizedException } from "@nestjs/common";
import { createHash } from "crypto";
import { describe, expect, it, vi } from "vitest";
import { MfaService, generateTotpCode } from "./mfa.service";

const org = {
  id: "org-1",
  slug: "o",
  name: "O",
  memberId: "m1",
  roleKeys: [],
  permissionKeys: [],
  isPlatformAdmin: false,
};
const user = {
  id: "u-1",
  email: "u@e.c",
  name: "U",
  sessionId: "s",
  role: "learner",
  isPlatformAdmin: false,
  activeOrganizationId: "org-1",
};

describe("generateTotpCode", () => {
  it("returns a 6-digit code", () => {
    const secret = Buffer.alloc(20, 1);
    const code = generateTotpCode(secret, 1_700_000_000_000);
    expect(code).toMatch(/^\d{6}$/);
  });

  it("is stable within the same 30s counter window", () => {
    const secret = Buffer.from("0123456789abcdef0123");
    // Align to start of a window so +15s stays in the same counter.
    const windowStart = Math.floor(1_700_000_000_000 / 30_000) * 30_000;
    const a = generateTotpCode(secret, windowStart);
    const b = generateTotpCode(secret, windowStart + 15_000);
    expect(a).toBe(b);
  });

  it("changes across windows", () => {
    const secret = Buffer.from("0123456789abcdef0123");
    const windowStart = Math.floor(1_700_000_000_000 / 30_000) * 30_000;
    const a = generateTotpCode(secret, windowStart);
    const b = generateTotpCode(secret, windowStart + 30_000);
    expect(a).not.toBe(b);
  });
});

describe("MfaService backup codes and list", () => {
  it("verifies hashed backup codes and lists factors", async () => {
    const plain = "ABCD-EFGH";
    const hashed = createHash("sha256").update(plain).digest("hex");
    const prisma = {
      mfaFactor: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({
            id: "bf-1",
            backupCodes: [hashed, "other"],
          }),
        findMany: vi.fn().mockResolvedValue([{ id: "f1", type: "TOTP" }]),
        update: vi.fn().mockResolvedValue({ id: "bf-1" }),
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn(),
      },
    };
    const service = new MfaService(prisma as never);
    await expect(service.verify(user.id, plain)).resolves.toMatchObject({
      valid: true,
      type: "BACKUP_CODE",
    });
    expect(await service.listFactors(user.id)).toEqual([
      { id: "f1", type: "TOTP" },
    ]);
    await expect(service.disable(user.id, "TOTP")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("rejects invalid codes when no factors match", async () => {
    const prisma = {
      mfaFactor: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn(),
        update: vi.fn(),
        deleteMany: vi.fn(),
        create: vi.fn(),
      },
    };
    const service = new MfaService(prisma as never);
    await expect(service.verify(user.id, "000000")).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("enrolls TOTP and backup factors, verifies TOTP, disables", async () => {
    const created: Record<string, unknown>[] = [];
    const prisma = {
      mfaFactor: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const row = { id: `f-${created.length + 1}`, ...data };
          created.push(row);
          return row;
        }),
        findFirst: vi.fn(async ({ where }: { where: { type: string } }) => {
          if (where.type === "TOTP") {
            const totp = created.find((c) => c.type === "TOTP");
            return totp ?? null;
          }
          return created.find((c) => c.type === "BACKUP_CODE") ?? null;
        }),
        update: vi.fn().mockResolvedValue({ id: "f-1" }),
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn(),
      },
    };
    const service = new MfaService(prisma as never);
    const totp = await service.enroll(org, user as never, "TOTP");
    expect(totp.type).toBe("TOTP");
    expect(totp.secret).toMatch(/^[A-Z2-7]+$/);
    expect(totp.otpauthUrl).toContain("otpauth://totp/");

    const secretHex = created.find((c) => c.type === "TOTP")!.secret as string;
    const code = generateTotpCode(Buffer.from(secretHex, "hex"), Date.now());
    await expect(service.verify(user.id, code)).resolves.toMatchObject({
      valid: true,
      type: "TOTP",
    });

    const backup = await service.enroll(null, user as never, "BACKUP_CODE");
    expect(backup.type).toBe("BACKUP_CODE");
    expect(backup.codes).toHaveLength(8);
    const plain = backup.codes![0]!;
    await expect(service.verify(user.id, plain)).resolves.toMatchObject({
      valid: true,
      type: "BACKUP_CODE",
    });

    await expect(service.disable(user.id, "TOTP")).resolves.toEqual({
      removed: 1,
    });
  });
});
