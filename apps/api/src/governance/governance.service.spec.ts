import { describe, expect, it, vi } from "vitest";
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { GovernanceService } from "./governance.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: [
    "organizations:manage",
    "users:read",
    "users:update",
    "courses:read",
    "courses:create",
    "courses:update",
    "courses:publish",
    "files:read",
    "files:create",
    "files:delete",
    "content-library:manage",
    "content:process",
    "quiz:manage",
    "quiz:grade",
    "assignments:manage",
    "assignments:grade",
    "certificates:manage",
    "certificates:issue",
    "goals:manage",
    "plugins:configure",
    "analytics:view",
    "analytics:export",
    "audit:read",
    "memberships:manage",
    "roles:manage",
    "platform:admin",
  ],
  isPlatformAdmin: true,
};
const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "org_admin",
  isPlatformAdmin: true,
  activeOrganizationId: "org-a",
};

function setup() {
  const legalDocs = new Map<string, Record<string, any>>();
  const consents: Record<string, any>[] = [];
  const cookieConsents = new Map<string, Record<string, any>>();
  const dataExportRequests = new Map<string, Record<string, any>>();
  const anonymizationRequests = new Map<string, Record<string, any>>();
  const retentionPolicies = new Map<string, Record<string, any>>();
  const backupJobs = new Map<string, Record<string, any>>();
  const auditLogs: Record<string, any>[] = [];

  let currentUser = {
    id: user.id,
    email: "u@e.c",
    name: "Tester",
    passwordHash: "hash",
    status: "ACTIVE",
  };

  const membership = {
    id: "mem-1",
    organizationId: org.id,
    userId: user.id,
    status: "ACTIVE",
  };

  const prisma: any = {
    legalDocument: {
      findMany: vi.fn(async (args: any) => {
        let list = Array.from(legalDocs.values());
        if (args?.where?.organizationId) {
          list = list.filter((d) => d.organizationId === args.where.organizationId);
        }
        if (args?.where?.type) {
          list = list.filter((d) => d.type === args.where.type);
        }
        if (args?.where?.publishedAt) {
          list = list.filter((d) => d.publishedAt);
        }
        return list;
      }),
      findFirst: vi.fn(async (args: any) => {
        if (args?.where?.id) {
          return legalDocs.get(args.where.id) ?? null;
        }
        return null;
      }),
      create: vi.fn(async (args: any) => {
        const id = `doc-${legalDocs.size + 1}`;
        const created = { id, ...args.data };
        legalDocs.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = legalDocs.get(args.where.id);
        const updated = { ...(existing ?? { id: args.where.id }), ...args.data };
        legalDocs.set(args.where.id, updated);
        return updated;
      }),
    },
    consentRecord: {
      create: vi.fn(async (args: any) => {
        const created = { id: `c-${consents.length + 1}`, ...args.data };
        consents.push(created);
        return created;
      }),
      findMany: vi.fn(async (args: any) =>
        consents.filter((c) => c.organizationId === args?.where?.organizationId && c.userId === args?.where?.userId),
      ),
    },
    cookieConsent: {
      upsert: vi.fn(async (args: any) => {
        const key = `${args.where.organizationId_sessionId.organizationId}:${args.where.organizationId_sessionId.sessionId}`;
        const existing = cookieConsents.get(key);
        const merged = {
          id: existing?.id ?? `cc-${cookieConsents.size + 1}`,
          ...existing,
          ...args.update,
          ...args.create,
        };
        cookieConsents.set(key, merged);
        return merged;
      }),
    },
    dataExportRequest: {
      findFirst: vi.fn(async (args: any) => {
        return (
          [...dataExportRequests.values()].find(
            (r: any) =>
              r.organizationId === args.where.organizationId &&
              r.userId === args.where.userId &&
              ["PENDING", "RUNNING"].includes(r.status),
          ) ?? null
        );
      }),
      create: vi.fn(async (args: any) => {
        const id = `de-${dataExportRequests.size + 1}`;
        const created = { id, ...args.data };
        dataExportRequests.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = dataExportRequests.get(args.where.id);
        const updated = { ...(existing ?? { id: args.where.id }), ...args.data };
        dataExportRequests.set(args.where.id, updated);
        return updated;
      }),
      findMany: vi.fn(async (args: any) => {
        return Array.from(dataExportRequests.values()).filter(
          (r) => r.organizationId === args.where.organizationId,
        );
      }),
    },
    anonymizationRequest: {
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: any) => {
        const id = `an-${anonymizationRequests.size + 1}`;
        const created = { id, ...args.data };
        anonymizationRequests.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = anonymizationRequests.get(args.where.id);
        const updated = { ...(existing ?? { id: args.where.id }), ...args.data };
        anonymizationRequests.set(args.where.id, updated);
        return updated;
      }),
    },
    retentionPolicy: {
      findMany: vi.fn(async (args: any) => {
        return Array.from(retentionPolicies.values()).filter(
          (r) => r.organizationId === args?.where?.organizationId,
        );
      }),
      upsert: vi.fn(async (args: any) => {
        const key = `${args.where.organizationId_entityType.organizationId}:${args.where.organizationId_entityType.entityType}`;
        const existing = retentionPolicies.get(key);
        const updated = {
          id: existing?.id ?? `rp-${retentionPolicies.size + 1}`,
          organizationId: args.where.organizationId_entityType.organizationId,
          entityType: args.where.organizationId_entityType.entityType,
          ...args.update,
          ...args.create,
        };
        retentionPolicies.set(key, updated);
        return updated;
      }),
    },
    backupJob: {
      findMany: vi.fn(async (args: any) => {
        return Array.from(backupJobs.values()).filter(
          (b) => b.organizationId === args?.where?.organizationId,
        );
      }),
      create: vi.fn(async (args: any) => {
        const id = `bj-${backupJobs.size + 1}`;
        const created = { id, ...args.data };
        backupJobs.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = backupJobs.get(args.where.id);
        const updated = { ...(existing ?? { id: args.where.id }), ...args.data };
        backupJobs.set(args.where.id, updated);
        return updated;
      }),
    },
    user: {
      findUnique: vi.fn(async () => currentUser),
      update: vi.fn(async (args: any) => {
        currentUser = { ...currentUser, ...args.data };
        return currentUser;
      }),
    },
    organizationMember: {
      findFirst: vi.fn(async () => membership),
      update: vi.fn(async (args: any) => ({ ...membership, ...args.data })),
    },
    userSession: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    refreshSession: {
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    mfaFactor: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    oauthAccount: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    oAuthAccount: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
    },
    enrollment: { findMany: vi.fn(async () => []) },
    activityProgress: { findMany: vi.fn(async () => []) },
    learnerNote: { findMany: vi.fn(async () => []) },
    learnerBookmark: { findMany: vi.fn(async () => []) },
    learningGoal: { findMany: vi.fn(async () => []) },
    assignmentSubmission: { findMany: vi.fn(async () => []) },
    quizAttempt: { findMany: vi.fn(async () => []) },
    xpTransaction: { findMany: vi.fn(async () => []) },
    auditLog: {
      create: vi.fn(async (args: any) => {
        auditLogs.push(args.data);
        return { id: `audit-${auditLogs.length}`, ...args.data };
      }),
    },
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback({
        user: { update: prisma.user.update },
        organizationMember: { update: prisma.organizationMember.update },
        userSession: { updateMany: prisma.userSession.updateMany },
        refreshSession: { updateMany: prisma.refreshSession.updateMany },
        mfaFactor: { deleteMany: prisma.mfaFactor.deleteMany },
        oauthAccount: { deleteMany: prisma.oauthAccount.deleteMany },
        oAuthAccount: { deleteMany: prisma.oAuthAccount.deleteMany },
      }),
    ),
  };

  const service = new GovernanceService(prisma);
  return { service, prisma, auditLogs, legalDocs, retentionPolicies, backupJobs };
}

describe("GovernanceService", () => {
  it("creates a legal document and lists it", async () => {
    const { service } = setup();
    const created = await service.createLegalDocument(org, user.id, {
      type: "PRIVACY_POLICY",
      version: "1.0.0",
      title: "Privacy Policy",
      content: "We respect your privacy.",
      effectiveAt: new Date().toISOString(),
      publish: true,
    });
    expect(created.type).toBe("PRIVACY_POLICY");
    const list = await service.listLegalDocuments(org);
    expect(list).toHaveLength(1);
  });

  it("records consent and lists per-user consents", async () => {
    const { service } = setup();
    await service.recordConsent(org, user.id, {
      documentType: "TERMS",
      documentVersion: "1.0.0",
    });
    const list = await service.listMyConsents(org.id, user.id);
    expect(list).toHaveLength(1);
    expect(list[0]!.documentType).toBe("TERMS");
  });

  it("creates and updates a retention policy", async () => {
    const { service } = setup();
    const created = await service.upsertRetentionPolicy(org, user.id, {
      entityType: "audit_log",
      retentionDays: 180,
      anonymize: true,
    });
    expect(created.entityType).toBe("audit_log");
    const updated = await service.upsertRetentionPolicy(org, user.id, {
      entityType: "audit_log",
      retentionDays: 90,
    });
    expect(updated.retentionDays).toBe(90);
  });

  it("triggers a backup job and reports completed status", async () => {
    const { service, backupJobs } = setup();
    const job = await service.triggerBackupJob(org, user.id, {
      type: "FULL",
    });
    expect(job.status).toBe("COMPLETED");
    expect(backupJobs.size).toBe(1);
  });

  it("records cookie consent with required fields", async () => {
    const { service } = setup();
    const result = await service.recordCookieConsent(
      org,
      {
        necessary: true,
        analytics: true,
        marketing: false,
        sessionId: "sess-1",
      },
      "127.0.0.1",
      "ua",
    );
    expect(result.analytics).toBe(true);
    expect(result.marketing).toBe(false);
  });

  it("requests a data export and marks it completed", async () => {
    const { service } = setup();
    const result = await service.requestDataExport(org, user.id, {});
    expect(result.status).toBe("COMPLETED");
    expect(result.downloadUrl).toContain(result.id);
  });

  it("refuses to anonymize without explicit confirmation", async () => {
    const { service } = setup();
    await expect(
      service.requestAnonymization(org, user.id, { confirm: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("anonymizes the user when confirmed", async () => {
    const { service, prisma } = setup();
    const result = await service.requestAnonymization(org, user.id, {
      confirm: true,
    });
    expect(result.status).toBe("COMPLETED");
    expect(prisma.user.update).toHaveBeenCalled();
    expect(prisma.mfaFactor.deleteMany).toHaveBeenCalled();
  });

  it("rejects anonymization when the user is not a member", async () => {
    const { service, prisma } = setup();
    prisma.organizationMember.findFirst = vi.fn(async () => null);
    await expect(
      service.requestAnonymization(org, user.id, { confirm: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
