import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { ensureEnrollment } from "./ensure-enrollment";

describe("ensureEnrollment", () => {
  it("returns active enrollment", async () => {
    const enrollment = { id: "e1", status: "ACTIVE" };
    const prisma = {
      enrollment: {
        findUnique: vi.fn().mockResolvedValue(enrollment),
      },
    };
    await expect(
      ensureEnrollment(prisma as never, "org", "user", "course"),
    ).resolves.toEqual(enrollment);
  });

  it("rejects missing enrollment", async () => {
    const prisma = {
      enrollment: { findUnique: vi.fn().mockResolvedValue(null) },
    };
    await expect(
      ensureEnrollment(prisma as never, "org", "user", "course"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects inactive enrollment", async () => {
    const prisma = {
      enrollment: {
        findUnique: vi.fn().mockResolvedValue({ id: "e1", status: "DROPPED" }),
      },
    };
    await expect(
      ensureEnrollment(prisma as never, "org", "user", "course"),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
