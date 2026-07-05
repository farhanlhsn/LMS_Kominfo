import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { PopoutService } from "./popout.service";
import { createHash } from "node:crypto";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["learner"],
  permissionKeys: ["courses:read"],
  isPlatformAdmin: false,
};

function setup() {
  const sessions = new Map<string, Record<string, any>>();
  const prisma: any = {
    popoutSession: {
      create: vi.fn(async (args: any) => {
        const id = `popout-${sessions.size + 1}`;
        const session = { id, ...args.data };
        sessions.set(session.token, session);
        return session;
      }),
      findUnique: vi.fn(async (args: any) => {
        return sessions.get(args?.where?.token) ?? null;
      }),
      update: vi.fn(async (args: any) => {
        for (const [key, value] of sessions.entries()) {
          if (value.id === args.where.id) {
            sessions.set(key, { ...value, ...args.data });
            return sessions.get(key);
          }
        }
        return null;
      }),
      delete: vi.fn(async (args: any) => {
        for (const [key, value] of sessions.entries()) {
          if (value.id === args.where.id) {
            sessions.delete(key);
            return { id: value.id };
          }
        }
        return null;
      }),
    },
  };
  return { service: new PopoutService(prisma), sessions, prisma };
}

function hash(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

describe("PopoutService", () => {
  it("issues a token with hashed storage", async () => {
    const { service, sessions } = setup();
    const result = await service.issueToken(org, "u1", "lesson-1", undefined);
    expect(result.token).toBeTruthy();
    expect(sessions.size).toBe(1);
    const stored = Array.from(sessions.values())[0]!;
    expect(stored.token).toBe(hash(result.token));
  });

  it("clamps TTL to the allowed window", async () => {
    const { service } = setup();
    const tooShort = (await service.issueToken(org, "u1", "l1", 100)) as any;
    const tooLong = (await service.issueToken(org, "u1", "l1", 10_000_000_000)) as any;
    expect(tooShort.expiresAt.getTime() - Date.now()).toBeGreaterThanOrEqual(60_000);
    expect(tooLong.expiresAt.getTime() - Date.now()).toBeLessThanOrEqual(12 * 60 * 60 * 1000);
  });

  it("validates a valid token and refreshes lastSeenAt", async () => {
    const { service, sessions } = setup();
    const issued = await service.issueToken(org, "u1", "lesson-1", undefined);
    const result = await service.validateToken(issued.token);
    expect(result.lessonId).toBe("lesson-1");
    const stored = sessions.get(hash(issued.token))!;
    expect(stored.lastSeenAt).toBeInstanceOf(Date);
  });

  it("throws when validating an unknown token", async () => {
    const { service } = setup();
    await expect(service.validateToken("nope")).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it("throws when validating an expired token", async () => {
    const { service, sessions } = setup();
    const expired = {
      id: "x1",
      organizationId: "org-a",
      userId: "u1",
      lessonId: "l1",
      token: hash("expired"),
      expiresAt: new Date(Date.now() - 1000),
      lastSeenAt: new Date(),
    };
    sessions.set(expired.token, expired);
    await expect(service.validateToken("expired")).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it("revokes a token belonging to the same user", async () => {
    const { service, sessions } = setup();
    const issued = await service.issueToken(org, "u1", "l1", undefined);
    const result = await service.revokeToken("org-a", "u1", issued.token);
    expect(result.revoked).toBe(true);
    expect(sessions.has(hash(issued.token))).toBe(false);
  });

  it("rejects revoking another user's token", async () => {
    const { service } = setup();
    const issued = await service.issueToken(org, "u1", "l1", undefined);
    await expect(
      service.revokeToken("org-a", "u2", issued.token),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
