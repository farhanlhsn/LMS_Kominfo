import { NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { GamificationService } from "./gamification.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };

function setup(overrides: Record<string, unknown> = {}) {
  const prisma = {
    skill: { create: vi.fn().mockResolvedValue({ id: "skill-a" }), findFirst: vi.fn().mockResolvedValue({ id: "skill-a", organizationId: "org-a" }), findMany: vi.fn().mockResolvedValue([]), update: vi.fn(), delete: vi.fn() },
    course: { findFirst: vi.fn().mockResolvedValue({ id: "course-a", organizationId: "org-a", deletedAt: null }) },
    courseSkill: { deleteMany: vi.fn(), createManyAndReturn: vi.fn().mockResolvedValue([]), findMany: vi.fn().mockResolvedValue([]) },
    userSkill: { findMany: vi.fn().mockResolvedValue([]) },
    xpTransaction: { create: vi.fn().mockResolvedValue({ id: "xp-a" }), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 500 } }), groupBy: vi.fn().mockResolvedValue([]) },
    leaderboardSnapshot: { findFirst: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "snap-a" }) },
    achievement: { create: vi.fn().mockResolvedValue({ id: "ach-a" }), findMany: vi.fn().mockResolvedValue([]) },
    userAchievement: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn().mockResolvedValue({ id: "ua-a" }) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
    ...overrides,
  };
  return { service: new GamificationService(prisma as never), prisma };
}

describe("GamificationService", () => {
  describe("Skills", () => {
    it("creates a skill with slug", async () => {
      const { service, prisma } = setup();
      await service.createSkill(org, { name: "JavaScript" });
      expect(prisma.skill.create).toHaveBeenCalledWith({ data: { organizationId: "org-a", name: "JavaScript", slug: "javascript", description: undefined, category: undefined } });
    });

    it("lists skills with count", async () => {
      const { service } = setup();
      const result = await service.listSkills(org);
      expect(Array.isArray(result)).toBe(true);
    });

    it("deletes a skill", async () => {
      const { service, prisma } = setup();
      const result = await service.deleteSkill(org, "skill-a");
      expect(prisma.skill.delete).toHaveBeenCalled();
      expect(result.deleted).toBe(true);
    });

    it("rejects delete for cross-tenant skill", async () => {
      const { service } = setup({ skill: { findFirst: vi.fn().mockResolvedValue(null) } });
      await expect(service.deleteSkill(org, "skill-org-b")).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe("XP", () => {
    it("awards XP and triggers achievement check", async () => {
      const { service, prisma } = setup();
      prisma.achievement.findMany = vi.fn().mockResolvedValue([]);
      await service.awardXp(org, "user-a", 100, "Test", "test", "src-1");
      expect(prisma.xpTransaction.create).toHaveBeenCalledWith({ data: { organizationId: "org-a", userId: "user-a", amount: 100, reason: "Test", sourceType: "test", sourceId: "src-1" } });
    });
  });

  describe("Leaderboard", () => {
    it("returns all-time rankings", async () => {
      const { service, prisma } = setup();
      prisma.xpTransaction.groupBy = vi.fn().mockResolvedValue([{ userId: "u1", _sum: { amount: 500 } }]);
      prisma.user.findMany = vi.fn().mockResolvedValue([{ id: "u1", name: "Alice", email: "a@x.com" }]);
      const result = await service.getLeaderboard(org, {});
      expect(result).toHaveLength(1);
      expect(result[0]!.name).toBe("Alice");
    });
  });

  describe("Achievements", () => {
    it("creates an achievement", async () => {
      const { service, prisma } = setup();
      await service.createAchievement(org, { key: "test", name: "Test Badge" });
      expect(prisma.achievement.create).toHaveBeenCalled();
    });

    it("checks achievements and awards XP for new ones", async () => {
      const { service, prisma } = setup();
      prisma.xpTransaction.aggregate = vi.fn().mockResolvedValue({ _sum: { amount: 1500 } });
      prisma.achievement.findMany = vi.fn().mockResolvedValue([{ id: "ach-1", key: "xp_master", name: "XP Master", xpReward: 500, criteria: { minXp: 1000 } }]);
      prisma.userAchievement.findMany = vi.fn().mockResolvedValue([]);
      await service.checkAchievements(org, "user-a");
      expect(prisma.userAchievement.create).toHaveBeenCalled();
    });
  });

  it("covers skill/course/xp/snapshot/list helpers", async () => {
    const { service, prisma } = setup();
    await service.updateSkill(org as any, "skill-a", { name: "TS" } as any);
    await service.setCourseSkills(org as any, "course-a", [
      { skillId: "skill-a", level: 1 },
    ] as any);
    await service.getCourseSkills("course-a");
    await service.getUserSkills(org as any, "user-a");
    await service.getXpHistory(org as any, "user-a", { page: 1, limit: 10 } as any);
    await service.listAchievements(org as any);
    await service.getUserAchievements("user-a");
    prisma.xpTransaction.groupBy = vi.fn().mockResolvedValue([
      { userId: "u1", _sum: { amount: 100 } },
    ]);
    prisma.user.findMany = vi
      .fn()
      .mockResolvedValue([{ id: "u1", name: "A", email: "a@x.com" }]);
    await service.takeSnapshot(org as any, "weekly");
    expect(prisma.skill.update).toHaveBeenCalled();
    expect(prisma.leaderboardSnapshot.create).toHaveBeenCalled();
  });
});
