import { describe, expect, it, vi } from "vitest";
import { GamificationService } from "./gamification.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["org_admin"], permissionKeys: [], isPlatformAdmin: false };

function setup(overrides: Record<string, any> = {}) {
  const prisma = {
    xpTransaction: {
      findMany: vi.fn().mockResolvedValue([{ id: "x1", amount: 100 }]),
      count: vi.fn().mockResolvedValue(1),
      aggregate: vi.fn().mockResolvedValue({ _sum: { amount: 250 } }),
    },
    leaderboardSnapshot: { findFirst: vi.fn().mockResolvedValue(null) },
    ...overrides,
  };
  return { service: new GamificationService(prisma as never), prisma };
}

describe("GamificationService.getXpHistory", () => {
  it("paginates XP history and totals amounts", async () => {
    const { service, prisma } = setup();
    const result = await service.getXpHistory(org, "user-a", { page: 1, limit: 10 });
    expect(prisma.xpTransaction.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: "org-a", userId: "user-a" }, skip: 0, take: 10 })
    );
    expect(result).toMatchObject({
      data: [{ id: "x1", amount: 100 }],
      meta: { page: 1, limit: 10, total: 1, totalPages: 1 },
      totalXp: 250,
    });
  });

  it("returns snapshot rankings for weekly period", async () => {
    const { service, prisma } = setup({
      leaderboardSnapshot: { findFirst: vi.fn().mockResolvedValue({ rankings: [{ rank: 1, userId: "u1", name: "Alice", totalXp: 200 }] }) },
    });
    const result = await service.getLeaderboard(org, { period: "WEEKLY" as any });
    expect(result).toEqual([{ rank: 1, userId: "u1", name: "Alice", totalXp: 200 }]);
  });

  it("falls back to empty list when no snapshot exists", async () => {
    const { service } = setup();
    const result = await service.getLeaderboard(org, { period: "MONTHLY" as any });
    expect(result).toEqual([]);
  });
});
