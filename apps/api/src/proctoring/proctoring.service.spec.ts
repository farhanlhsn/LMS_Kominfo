import { describe, expect, it, vi } from "vitest";
import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { ProctoringService } from "./proctoring.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: ["platform:admin"],
  isPlatformAdmin: true,
};
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "org_admin", isPlatformAdmin: true, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const prisma = {
    proctoringSession: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "ps-1", ...data, integrityScore: null })),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "ps-1", ...data })),
      findMany: vi.fn().mockResolvedValue([]),
    },
    proctoringEvent: {
      create: vi.fn().mockResolvedValue({ id: "pe-1", severity: "LOW" }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    proctoringFlag: {
      findFirst: vi.fn().mockResolvedValue({ id: "pf-1", organizationId: "org-a" }),
      findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn().mockResolvedValue({ id: "pf-1" }),
      createMany: vi.fn().mockResolvedValue({ count: 1 }),
      update: vi.fn().mockResolvedValue({ id: "pf-1" }),
    },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    $transaction: vi.fn(async (ops: any) => {
      if (typeof ops === "function") return ops(prisma);
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops;
    }),
    ...overrides,
  } as any;
  const provider = {
    analyzeEvents: vi.fn().mockResolvedValue({ integrityScore: 95, flags: [] }),
    computeIntegrityScore: vi.fn().mockReturnValue(95),
    sampleEvent: vi.fn().mockResolvedValue(null),
  } as any;
  return { service: new ProctoringService(prisma, provider), prisma, provider };
}

describe("ProctoringService.startSession", () => {
  it("creates a new proctoring session", async () => {
    const { service, prisma } = setup();
    const result = await service.startSession(org, user, { attemptId: "attempt-1" });
    expect(result.id).toBe("ps-1");
    expect(prisma.proctoringSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ organizationId: "org-a", userId: "u-1", status: "ACTIVE" }),
      }),
    );
  });

  it("returns existing session for the same user and attempt", async () => {
    const existing = { id: "ps-existing", userId: "u-1", attemptId: "attempt-1" };
    const { service, prisma } = setup({
      proctoringSession: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    });
    const result = await service.startSession(org, user, { attemptId: "attempt-1" });
    expect(result.id).toBe("ps-existing");
    expect(prisma.proctoringSession.create).not.toHaveBeenCalled();
  });

  it("rejects when attempt is already claimed by another user", async () => {
    const { service } = setup({
      proctoringSession: {
        findFirst: vi.fn().mockResolvedValue({ id: "ps-1", userId: "other-user" }),
      },
    });
    await expect(
      service.startSession(org, user, { attemptId: "attempt-1" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe("ProctoringService session lifecycle", () => {
  it("gets ends lists and reviews flags", async () => {
    const { service, prisma, provider } = setup();
    prisma.proctoringSession.findFirst.mockResolvedValue({
      id: "ps-1",
      organizationId: "org-a",
      userId: "u-1",
      status: "ACTIVE",
    });
    await service.getSession("org-a", "ps-1");
    await service.endSession("org-a", "ps-1", "u-1");
    expect(prisma.proctoringSession.update).toHaveBeenCalled();

    prisma.proctoringSession.findMany.mockResolvedValue([{ id: "ps-1" }]);
    expect(await service.listSessions("org-a", {})).toEqual([{ id: "ps-1" }]);

    await service.ingestEvent(org, user, "ps-1", {
      type: "TAB_SWITCH",
      severity: "HIGH",
    } as any);
    prisma.proctoringEvent.create
      .mockResolvedValueOnce({ id: "pe-2", severity: "HIGH" })
      .mockResolvedValueOnce({ id: "pe-3", severity: "LOW" });
    prisma.$transaction.mockImplementation(async (ops: any) => {
      if (Array.isArray(ops)) {
        return ops.map(() => ({ id: "pe-2", severity: "HIGH" }));
      }
      return ops;
    });
    await service.ingestBatch(org, user, "ps-1", {
      events: [{ type: "FACE_MISSING", severity: "HIGH" }],
    } as any);
    await service.sampleProviderEvent();
    expect(provider.sampleEvent).toHaveBeenCalled();

    prisma.proctoringFlag.findMany.mockResolvedValue([{ id: "pf-1" }]);
    expect(await service.listFlags("org-a", {})).toEqual([{ id: "pf-1" }]);
    prisma.proctoringFlag.update.mockResolvedValue({
      id: "pf-1",
      status: "REVIEWED",
    });
    await service.reviewFlag(org, user, "pf-1", {
      status: "REVIEWED",
    } as any);
  });
});


describe("ProctoringService.ingestEvent", () => {
  it("creates an event on an active session", async () => {
    const { service, prisma } = setup({
      proctoringSession: {
        findFirst: vi.fn().mockResolvedValue({ id: "ps-1", userId: "u-1", status: "ACTIVE" }),
        create: vi.fn(),
        update: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    });
    await service.ingestEvent(org, user, "ps-1", {
      type: "TAB_SWITCH",
      severity: "LOW",
      metadata: {},
    } as any);
    expect(prisma.proctoringEvent.create).toHaveBeenCalled();
  });

  it("throws NotFoundException for unknown session", async () => {
    const { service } = setup();
    await expect(
      service.ingestEvent(org, user, "bad-id", {
        type: "TAB_SWITCH",
        severity: "LOW",
        metadata: {},
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe("ProctoringService.listSessions", () => {
  it("returns sessions scoped to the organization", async () => {
    const { service, prisma } = setup({
      proctoringSession: {
        findMany: vi.fn().mockResolvedValue([{ id: "ps-1", organizationId: "org-a" }]),
      },
    });
    const result = await service.listSessions("org-a", {});
    expect(result).toHaveLength(1);
    expect(prisma.proctoringSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ organizationId: "org-a" }),
      }),
    );
  });
});
