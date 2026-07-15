import { describe, expect, it, vi } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ModerationService } from "./moderation.service";

const org = {
  id: "org-1",
  slug: "o1",
  name: "Org",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: [],
  isPlatformAdmin: true,
};
const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "admin",
  isPlatformAdmin: true,
  activeOrganizationId: "org-1",
};

function buildPrisma() {
  const reports = new Map<string, any>();
  const actions: any[] = [];
  const flags: any[] = [];
  const auditLogs: any[] = [];

  return {
    moderationReport: {
      create: vi.fn(async (args: any) => {
        const id = `rep-${reports.size + 1}`;
        const created = {
          id,
          ...args.data,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        reports.set(id, created);
        return created;
      }),
      findFirst: vi.fn(async ({ where }: any) => {
        for (const r of reports.values()) {
          if (r.id === where.id && r.organizationId === where.organizationId) {
            return r;
          }
        }
        return null;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return Array.from(reports.values()).filter((r) => {
          if (r.organizationId !== where.organizationId) return false;
          if (where?.targetType && r.targetType !== where.targetType) return false;
          if (where?.status && r.status !== where.status) return false;
          return true;
        });
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const r = reports.get(where.id);
        if (!r) return null;
        Object.assign(r, data);
        return r;
      }),
    },
    moderationAction: {
      create: vi.fn(async (args: any) => {
        const created = { id: `act-${actions.length + 1}`, ...args.data };
        actions.push(created);
        return created;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return actions.filter((a) => a.organizationId === where.organizationId);
      }),
    },
    contentFlag: {
      create: vi.fn(async (args: any) => {
        const created = { id: `flag-${flags.length + 1}`, ...args.data };
        flags.push(created);
        return created;
      }),
      findMany: vi.fn(async ({ where }: any) => {
        return flags.filter((f) => f.organizationId === where.organizationId);
      }),
    },
    auditLog: {
      create: vi.fn(async (args: any) => {
        auditLogs.push(args.data);
        return { id: `audit-${auditLogs.length}`, ...args.data };
      }),
    },
  };
}

describe("ModerationService", () => {
  it("creates a report and audits the action", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    const report = await service.createReport(org, user, {
      targetType: "CONTENT",
      targetId: "lesson-1",
      reason: "spam",
    });
    expect(report.status).toBe("OPEN");
    expect(prisma.auditLog.create).toHaveBeenCalled();
  });

  it("refuses self-reports", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    await expect(
      service.createReport(org, user, {
        targetType: "USER",
        targetId: user.id,
        reason: "spam",
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("lists reports filtered by status", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    await service.createReport(org, user, {
      targetType: "CONTENT",
      targetId: "lesson-1",
      reason: "spam",
    });
    const list = await service.listReports(org, { status: "OPEN" });
    expect(list).toHaveLength(1);
  });

  it("updates a report status", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    const created = await service.createReport(org, user, {
      targetType: "COMMENT",
      targetId: "comment-1",
      reason: "abuse",
    });
    const updated = await service.updateReport(org, user, created.id, {
      status: "IN_REVIEW",
    });
    expect(updated.status).toBe("IN_REVIEW");
    expect(updated.reviewedById).toBe(user.id);
  });

  it("records a moderation action", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    const action = await service.createAction(org, user, {
      targetType: "CONTENT",
      targetId: "lesson-1",
      actionType: "WARN",
      reason: "low quality",
    });
    expect(action.actionType).toBe("WARN");
  });

  it("flags content and lists flags", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    await service.flagContent(
      org,
      user,
      "CONTENT",
      "lesson-1",
      "auto-toxicity",
      { autoDetected: true, confidence: 0.91 },
    );
    const flags = await service.listFlags(org);
    expect(flags).toHaveLength(1);
    expect(flags[0]!.autoDetected).toBe(true);
  });

  it("covers update missing, listActions, ban guard, empty targetType", async () => {
    const prisma: any = buildPrisma();
    const service = new ModerationService(prisma);
    await expect(
      service.updateReport(org, user, "missing", { status: "OPEN" }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await service.listActions(org);
    await service.createAction(org, user, {
      targetType: "USER",
      targetId: "u-2",
      actionType: "BAN",
      reason: "abuse",
    });
    const learner = { ...user, isPlatformAdmin: false, role: "learner" };
    await expect(
      service.createAction(org, learner, {
        targetType: "USER",
        targetId: "u-2",
        actionType: "SUSPEND",
        reason: "x",
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.flagContent(org, user, "", "x", "spam"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
