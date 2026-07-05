import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { AuthenticatedUser } from "../auth/types/authenticated-request";
import type { OrganizationContext } from "../auth/types/authenticated-request";

// Length of a TOTP secret in bytes (Base32 encoded by the authenticator app).
const TOTP_SECRET_BYTES = 20;
const BACKUP_CODE_COUNT = 8;

function base32Encode(buffer: Buffer): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let output = "";
  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += alphabet[(value << (5 - bits)) & 31];
  }
  return output;
}

function generateTotpCode(secret: Buffer, timestamp: number, digits = 6): string {
  const counter = Math.floor(timestamp / 30_000);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hmac = createHash("sha1");
  hmac.update(secret);
  hmac.update(counterBuffer);
  const digest = hmac.digest();
  const offset = digest[digest.length - 1]! & 0x0f;
  const binary = ((digest[offset]! & 0x7f) << 24)
    | ((digest[offset + 1]! & 0xff) << 16)
    | ((digest[offset + 2]! & 0xff) << 8)
    | (digest[offset + 3]! & 0xff);
  const otp = binary % 10 ** digits;
  return otp.toString().padStart(digits, "0");
}

@Injectable()
export class MfaService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ============================================================
  // Enrollment
  // ============================================================

  async enroll(
    organization: OrganizationContext | null,
    user: AuthenticatedUser,
    type: "TOTP" | "BACKUP_CODE",
  ) {
    if (type === "TOTP") {
      const secret = randomBytes(TOTP_SECRET_BYTES);
      const secretBase32 = base32Encode(secret);
      const otpauthUrl = `otpauth://totp/LMS:${encodeURIComponent(
        user.email,
      )}?secret=${secretBase32}&issuer=LMS&algorithm=SHA1&digits=6&period=30`;
      const factor = await this.prisma.mfaFactor.create({
        data: {
          userId: user.id,
          organizationId: organization?.id,
          type: "TOTP",
          secret: secret.toString("hex"),
        },
      });
      return {
        id: factor.id,
        type: "TOTP",
        secret: secretBase32,
        otpauthUrl,
        verified: false,
      };
    }
    // BACKUP_CODE enrollment
    const codes = Array.from({ length: BACKUP_CODE_COUNT }, () =>
      randomBytes(4).toString("hex"),
    );
    const factor = await this.prisma.mfaFactor.create({
      data: {
        userId: user.id,
        organizationId: organization?.id,
        type: "BACKUP_CODE",
        backupCodes: codes as unknown as Prisma.InputJsonValue,
        verifiedAt: new Date(),
      },
    });
    return {
      id: factor.id,
      type: "BACKUP_CODE",
      codes,
      verified: true,
    };
  }

  // ============================================================
  // Verification
  // ============================================================

  async verify(userId: string, code: string) {
    const totpFactor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: "TOTP" },
      orderBy: { createdAt: "desc" },
    });
    if (totpFactor?.secret) {
      const secret = Buffer.from(totpFactor.secret, "hex");
      const now = Date.now();
      // Allow a 1-step skew in either direction for clock drift.
      for (const offset of [-30_000, 0, 30_000]) {
        const candidate = generateTotpCode(secret, now + offset);
        if (candidate === code) {
          await this.prisma.mfaFactor.update({
            where: { id: totpFactor.id },
            data: { verifiedAt: new Date(), lastUsedAt: new Date() },
          });
          return { valid: true, type: "TOTP" as const };
        }
      }
    }
    // Fallback: backup codes (hashed for storage comparison).
    const backupFactor = await this.prisma.mfaFactor.findFirst({
      where: { userId, type: "BACKUP_CODE" },
      orderBy: { createdAt: "desc" },
    });
    if (backupFactor) {
      const codes = Array.isArray(backupFactor.backupCodes)
        ? (backupFactor.backupCodes as string[])
        : [];
      const match = codes.find(
        (stored) => stored === code || this.hashBackupCode(code) === stored,
      );
      if (match) {
        const remaining = codes.filter((c) => c !== match);
        await this.prisma.mfaFactor.update({
          where: { id: backupFactor.id },
          data: {
            backupCodes: remaining as unknown as Prisma.InputJsonValue,
            lastUsedAt: new Date(),
          },
        });
        return { valid: true, type: "BACKUP_CODE" as const, remainingCodes: remaining.length };
      }
    }
    throw new UnauthorizedException("Invalid MFA code");
  }

  // ============================================================
  // Disable
  // ============================================================

  async disable(userId: string, type: "TOTP" | "BACKUP_CODE") {
    const result = await this.prisma.mfaFactor.deleteMany({
      where: { userId, type },
    });
    if (result.count === 0) {
      throw new NotFoundException("No active MFA factor of that type");
    }
    return { removed: result.count };
  }

  async listFactors(userId: string) {
    return this.prisma.mfaFactor.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  // ============================================================
  // Helpers
  // ============================================================

  private hashBackupCode(code: string): string {
    return createHash("sha256").update(code).digest("hex");
  }
}
