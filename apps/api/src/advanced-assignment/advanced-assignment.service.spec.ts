import { describe, expect, it, vi } from "vitest";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { AdvancedAssignmentService } from "./advanced-assignment.service";
import { MockPlagiarismProvider } from "./plagiarism.provider";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["instructor"],
  permissionKeys: ["courses:update", "courses:read", "assignments:grade"],
  isPlatformAdmin: false,
};
const user = {
  id: "u-1",
  email: "u@e.c",
  name: "Tester",
  sessionId: "s-1",
  role: "instructor",
  isPlatformAdmin: false,
  activeOrganizationId: "org-a",
};

function setup(options: {
  assignment?: Record<string, unknown>;
  submissions?: Array<Record<string, unknown>>;
  enrollments?: Array<{ userId: string; status: string }>;
} = {}) {
  const assignments = new Map<string, Record<string, any>>();
  if (options.assignment) {
    assignments.set("a-1", options.assignment);
  }
  const groups = new Map<string, Record<string, any>>();
  const peerReviewConfigs = new Map<string, Record<string, any>>();
  const plagiarismChecks: Record<string, unknown>[] = [];
  const showcases = new Map<string, Record<string, any>>();
  const portfolios = new Map<string, Record<string, any>>();
  const portfolioEntries: Record<string, unknown>[] = [];
  const annotations = new Map<string, Record<string, any>>();
  const enrollmentRows = options.enrollments ?? [
    { userId: "u-1", status: "ACTIVE" },
    { userId: "u-2", status: "ACTIVE" },
    { userId: "u-3", status: "ACTIVE" },
  ];
  const submissionRows = options.submissions ?? [
    { id: "s-1", userId: "u-1" },
    { id: "s-2", userId: "u-2" },
  ];
  const auditLogs: Record<string, unknown>[] = [];
  const tx: any = (callback: (prisma: any) => Promise<unknown>) => callback({});

  const prisma: any = {
    assignment: {
      findFirst: vi.fn(async (args: any) =>
        args?.where?.id ? assignments.get(args.where.id) ?? null : Array.from(assignments.values())[0] ?? null,
      ),
      findUnique: vi.fn(async (args: any) =>
        args?.where?.id ? assignments.get(args.where.id) ?? null : assignments.get("a-1") ?? null,
      ),
    },
    course: {
      findFirst: vi.fn(async () => ({ id: "c-1", organizationId: "org-a", deletedAt: null })),
    },
    courseInstructor: {
      findFirst: vi.fn(async () => ({ id: "ci-1" })),
    },
    assignmentGroup: {
      findFirst: vi.fn(async (args: any) => (args?.where?.id ? groups.get(args.where.id) ?? null : null)),
      findMany: vi.fn(async (args: any) => {
        const list = Array.from(groups.values());
        if (args?.where?.assignmentId) {
          return list.filter((g) => g.assignmentId === args.where.assignmentId);
        }
        return list;
      }),
      create: vi.fn(async (args: any) => {
        const id = `g-${groups.size + 1}`;
        const group = {
          id,
          organizationId: org.id,
          assignmentId: args.data.assignmentId,
          courseId: args.data.courseId,
          name: args.data.name,
          maxMembers: args.data.maxMembers ?? 5,
          status: "ACTIVE",
          members: (args.data.members?.create ?? []).map((m: any, i: number) => ({
            id: `gm-${id}-${i}`,
            organizationId: org.id,
            userId: m.userId,
            role: "member",
            user: { id: m.userId, email: `${m.userId}@e.c`, name: m.userId },
          })),
          _count: { submissions: 0 },
        };
        groups.set(id, group);
        return group;
      }),
      update: vi.fn(async (args: any) => {
        const existing = groups.get(args.where.id);
        const updated = { ...existing, ...args.data };
        groups.set(args.where.id, updated);
        return updated;
      }),
      delete: vi.fn(async (args: any) => {
        groups.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    assignmentGroupMember: {
      findFirst: vi.fn(async () => null),
      count: vi.fn(async () => 0),
      create: vi.fn(async (args: any) => ({
        id: `gm-${Date.now()}`,
        ...args.data,
        user: { id: args.data.userId, email: `${args.data.userId}@e.c`, name: args.data.userId },
      })),
      delete: vi.fn(async (args: any) => groups.size),
    },
    enrollment: {
      findUnique: vi.fn(async (args: any) => {
        if (!args?.where?.organizationId_courseId_userId) return null;
        const match = enrollmentRows.find(
          (e) => e.userId === args.where.organizationId_courseId_userId.userId,
        );
        return match ? { id: `enr-${match.userId}`, ...match } : null;
      }),
      count: vi.fn(async (args: any) => {
        if (!args?.where?.userId?.in) return enrollmentRows.length;
        return enrollmentRows.filter((e) => args.where.userId.in.includes(e.userId)).length;
      }),
      findMany: vi.fn(async () => enrollmentRows.map((e) => ({ userId: e.userId }))),
    },
    rubric: {
      findFirst: vi.fn(async () => ({ id: "r-1", organizationId: org.id })),
    },
    peerReviewConfig: {
      findUnique: vi.fn(async (args: any) => {
        if (args?.where?.assignmentId) {
          return peerReviewConfigs.get(args.where.assignmentId) ?? null;
        }
        if (args?.where?.id) {
          return peerReviewConfigs.get(args.where.id) ?? null;
        }
        return null;
      }),
      findFirst: vi.fn(async (args: any) => {
        if (args?.where?.assignmentId) {
          return peerReviewConfigs.get(args.where.assignmentId) ?? null;
        }
        return null;
      }),
      create: vi.fn(async (args: any) => {
        const id = `prc-${peerReviewConfigs.size + 1}`;
        const created = { id, ...args.data };
        peerReviewConfigs.set(args.data.assignmentId, created);
        return created;
      }),
      upsert: vi.fn(async (args: any) => {
        const existing = peerReviewConfigs.get(args.where.assignmentId);
        const next = { ...(existing ?? { id: `prc-${peerReviewConfigs.size + 1}` }), ...args.update, ...args.create };
        peerReviewConfigs.set(args.where.assignmentId, next);
        return next;
      }),
    },
    peerReviewMatch: {
      findMany: vi.fn(async () => []),
      findFirst: vi.fn(async () => null),
      create: vi.fn(async (args: any) => ({
        id: `prm-${Date.now()}`,
        ...args.data,
        config: { id: args.data.configId, anonymize: true, assignmentId: "a-1" },
        submission: { id: args.data.submissionId, assignmentId: "a-1" },
        reviewer: { id: args.data.reviewerUserId },
        review: null,
      })),
    },
    peerReview: {
      upsert: vi.fn(async (args: any) => ({
        id: `pr-${Date.now()}`,
        ...args.update,
        ...args.create,
      })),
    },
    peerReviewRubricScore: {
      deleteMany: vi.fn(async () => ({ count: 0 })),
      createMany: vi.fn(async (args: any) => ({ count: args.data.length })),
    },
    assignmentSubmission: {
      findMany: vi.fn(async () => submissionRows),
      findFirst: vi.fn(async (args: any) => {
        if (args?.where?.id) {
          return submissionRows.find((s) => s.id === args.where.id) ?? submissionRows[0];
        }
        return submissionRows[0];
      }),
      findUnique: vi.fn(async (args: any) => {
        if (args?.where?.id) {
          return submissionRows.find((s) => s.id === args.where.id) ?? submissionRows[0];
        }
        return submissionRows[0];
      }),
    },
    submissionAnnotation: {
      findFirst: vi.fn(async (args: any) =>
        args?.where?.id ? annotations.get(args.where.id) ?? null : null,
      ),
      findMany: vi.fn(async () => []),
      create: vi.fn(async (args: any) => {
        const id = `an-${annotations.size + 1}`;
        const created = {
          id,
          ...args.data,
          author: { id: args.data.authorId, email: "u@e.c", name: "T" },
        };
        annotations.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = annotations.get(args.where.id) ?? {};
        const next = { ...existing, ...args.data };
        annotations.set(args.where.id, next);
        return next;
      }),
      delete: vi.fn(async (args: any) => {
        annotations.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    plagiarismCheck: {
      create: vi.fn(async (args: any) => ({
        id: `pc-${plagiarismChecks.length + 1}`,
        ...args.data,
        status: "RUNNING",
      })),
      update: vi.fn(async (args: any) => {
        const updated = { id: args.where.id, ...args.data };
        plagiarismChecks.push(updated);
        return updated;
      }),
      findMany: vi.fn(async () => plagiarismChecks),
    },
    projectShowcase: {
      findFirst: vi.fn(async (args: any) => {
        if (args?.where?.id) {
          return Array.from(showcases.values()).find((s) => s.id === args.where.id) ?? null;
        }
        if (args?.where?.submissionId) {
          return showcases.get(args.where.submissionId) ?? null;
        }
        return null;
      }),
      findMany: vi.fn(async (args: any) => {
        let list = Array.from(showcases.values());
        if (args?.where?.courseId) {
          list = list.filter((s) => s.courseId === args.where.courseId);
        }
        if (args?.where?.publishedAt) {
          list = list.filter((s) => s.publishedAt);
        }
        return list;
      }),
      findUnique: vi.fn(async (args: any) =>
        args?.where?.submissionId ? showcases.get(args.where.submissionId) ?? null : null,
      ),
      create: vi.fn(async (args: any) => {
        const id = `sc-${showcases.size + 1}`;
        const created = {
          id,
          ...args.data,
          viewCount: 0,
        };
        showcases.set(args.data.submissionId, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = Array.from(showcases.values()).find((s) => s.id === args.where.id);
        const updated = { ...(existing ?? { id: args.where.id }), ...args.data };
        showcases.set(updated.submissionId, updated);
        return updated;
      }),
      delete: vi.fn(async (args: any) => {
        const existing = Array.from(showcases.values()).find((s) => s.id === args.where.id);
        if (existing) showcases.delete(existing.submissionId);
        return existing;
      }),
    },
    portfolio: {
      findFirst: vi.fn(async (args: any) => {
        if (!args?.where?.userId) return null;
        const existing = Array.from(portfolios.values()).find((p) => p.userId === args.where.userId);
        if (!existing) return null;
        return {
          ...existing,
          entries: portfolioEntries
            .filter(
              (entry) =>
                entry.organizationId === org.id && entry.portfolioId === existing.id,
            )
            .sort(
              (a, b) => (a.orderIndex as number) - (b.orderIndex as number),
            ),
        };
      }),
      findUnique: vi.fn(async (args: any) => {
        if (args?.where?.shareToken) {
          const existing = Array.from(portfolios.values()).find((p) => p.shareToken === args.where.shareToken);
          if (!existing) return null;
          return {
            ...existing,
            user: { id: existing.userId, email: "u@e.c", name: existing.userId },
            entries: portfolioEntries.filter((entry) => entry.portfolioId === existing.id),
          };
        }
        return null;
      }),
      create: vi.fn(async (args: any) => {
        const id = `pf-${portfolios.size + 1}`;
        const created = { id, shareToken: null, isPublic: false, entries: [], ...args.data };
        portfolios.set(id, created);
        return created;
      }),
      update: vi.fn(async (args: any) => {
        const existing = portfolios.get(args.where.id);
        const updated = { ...(existing ?? { id: args.where.id }), ...args.data };
        portfolios.set(args.where.id, updated);
        return updated;
      }),
    },
    portfolioEntry: {
      findFirst: vi.fn(async (args: any) => portfolioEntries.find((e) => e.id === args?.where?.id) ?? null),
      create: vi.fn(async (args: any) => {
        const entry = { id: `pe-${portfolioEntries.length + 1}`, ...args.data };
        portfolioEntries.push(entry);
        return entry;
      }),
      update: vi.fn(async (args: any) => {
        const index = portfolioEntries.findIndex((e) => e.id === args.where.id);
        if (index >= 0) {
          portfolioEntries[index] = { ...portfolioEntries[index], ...args.data };
          return portfolioEntries[index];
        }
        return null;
      }),
      delete: vi.fn(async (args: any) => {
        const index = portfolioEntries.findIndex((e) => e.id === args.where.id);
        if (index >= 0) {
          portfolioEntries.splice(index, 1);
        }
        return { id: args.where.id };
      }),
    },
    auditLog: {
      create: vi.fn(async (args: any) => {
        auditLogs.push(args.data);
        return { id: `audit-${auditLogs.length}`, ...args.data };
      }),
    },
    $transaction: vi.fn((callback) => callback(tx)),
  };

  const service = new AdvancedAssignmentService(prisma, new MockPlagiarismProvider());
  return { service, prisma, tx, auditLogs };
}

describe("AdvancedAssignmentService", () => {
  it("creates a group assignment with members", async () => {
    const { service } = setup({
      assignment: { id: "a-1", organizationId: org.id, courseId: "c-1", collaborationMode: "GROUP", groupMaxMembers: 5, deletedAt: null },
      submissions: [],
    });
    const group = await service.createGroup(org, user.id, "a-1", {
      name: "Group A",
      memberIds: ["u-1", "u-2"],
    });
    expect(group).toMatchObject({ name: "Group A", members: expect.any(Array) });
    expect(group.members).toHaveLength(2);
  });

  it("rejects group creation when collaboration mode is INDIVIDUAL", async () => {
    const { service } = setup({
      assignment: { id: "a-1", organizationId: org.id, courseId: "c-1", collaborationMode: "INDIVIDUAL", groupMaxMembers: 5, deletedAt: null },
    });
    await expect(
      service.createGroup(org, user.id, "a-1", { name: "X" }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("upserts a peer review config and generates matches", async () => {
    const { service } = setup({
      assignment: { id: "a-1", organizationId: org.id, courseId: "c-1", deletedAt: null },
      submissions: [
        { id: "s-1", userId: "u-1" },
        { id: "s-2", userId: "u-2" },
        { id: "s-3", userId: "u-3" },
      ],
    });
    const config = await service.upsertPeerReviewConfig(org, user.id, "a-1", {
      reviewsRequired: 1,
      reviewsToReceive: 1,
    });
    expect(config).toBeTruthy();
    const matches = await service.generatePeerReviewMatches(org, user.id, "a-1");
    expect(matches.count).toBeGreaterThan(0);
  });

  it("runs a plagiarism check and persists the result", async () => {
    const { service, prisma } = setup({
      assignment: { id: "a-1", organizationId: org.id, courseId: "c-1", deletedAt: null },
    });
    const submission = {
      id: "s-1",
      organizationId: org.id,
      courseId: "c-1",
      assignmentId: "a-1",
      userId: "u-1",
      textAnswer: "This is a test paragraph with wikipedia content that is repeated repeated repeated.",
      fileIds: [],
      metadata: {},
    };
    prisma.assignmentSubmission.findFirst = vi.fn(async () => submission);
    prisma.assignmentSubmission.findUnique = vi.fn(async () => submission);
    const result = await service.runPlagiarismCheck(org, user.id, "s-1", {});
    expect(result.status).toBe("COMPLETED");
    expect(result.similarityScore).toBeGreaterThan(0);
  });

  it("creates an annotation, updates it, then resolves it", async () => {
    const { service } = setup({
      assignment: { id: "a-1", organizationId: org.id, courseId: "c-1", deletedAt: null },
    });
    const created = await service.createAnnotation(org, user.id, "s-1", {
      startOffset: 0,
      endOffset: 5,
      selectedText: "Hello",
      comment: "Initial comment",
    });
    expect(created).toMatchObject({ comment: "Initial comment" });
    const updated = await service.updateAnnotation(org, user.id, created.id, {
      resolved: true,
    });
    expect(updated).toMatchObject({ resolved: true });
  });

  it("creates a project showcase and toggles publish state", async () => {
    const { service, prisma } = setup({
      assignment: { id: "a-1", organizationId: org.id, courseId: "c-1", deletedAt: null },
    });
    prisma.assignmentSubmission.findFirst = vi.fn(async () => ({ id: "s-1", organizationId: org.id, courseId: "c-1" }));
    const created = await service.createShowcase(org, user.id, "c-1", "s-1", {
      title: "Project Alpha",
      summary: "Demo",
      publish: true,
    });
    expect(created.publishedAt).toBeTruthy();
    const updated = await service.updateShowcase(org, user.id, created.id, { published: false });
    expect(updated.publishedAt).toBeNull();
  });

  it("auto-creates a portfolio for a learner and lets them update it", async () => {
    const { service } = setup();
    const portfolio = await service.getMyPortfolio(org.id, "u-9");
    expect(portfolio.userId).toBe("u-9");
    const updated = await service.updateMyPortfolio(org.id, "u-9", { isPublic: true });
    expect(updated.isPublic).toBe(true);
    expect(updated.shareToken).toBeTruthy();
    const entry = await service.addPortfolioEntry(org.id, "u-9", { title: "Project 1" });
    expect(entry).toMatchObject({ title: "Project 1" });
    const list = await service.getMyPortfolio(org.id, "u-9");
    expect(list.entries).toHaveLength(1);
  });

  it("rejects updates for non-owners or missing portfolio", async () => {
    const { service } = setup();
    await service.getMyPortfolio(org.id, "u-9");
    await expect(
      service.updateMyPortfolio(org.id, "u-10", { title: "Hacked" }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("rejects cross-user updates when the portfolio already exists", async () => {
    const { service, prisma } = setup();
    prisma.portfolio.findFirst = vi.fn(async () => ({
      id: "pf-1",
      organizationId: org.id,
      userId: "u-9",
      title: "Existing",
      isPublic: false,
      shareToken: null,
    }));
    await expect(
      service.updateMyPortfolio(org.id, "u-10", { title: "Hacked" }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("propagates not found for missing submission", async () => {
    const { service, prisma } = setup();
    prisma.assignmentSubmission.findFirst = vi.fn(async () => null);
    await expect(
      service.runPlagiarismCheck(org, user.id, "missing", {}),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
