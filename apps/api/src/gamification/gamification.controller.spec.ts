import { NotFoundException } from "@nestjs/common";
import { describe,expect,it,vi } from "vitest";
import { GamificationController } from "./gamification.controller";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["admin"], permissionKeys: [], isPlatformAdmin: false };
const user = { id: "u-1", email: "u@e.c", name: "Tester", sessionId: "s-1", role: "admin", isPlatformAdmin: false, activeOrganizationId: "org-a" };

function setup(overrides: Record<string, any> = {}) {
  const gamification = {
    createSkill: vi.fn().mockResolvedValue({ id: "skill-1", name: "JS" }),
    listSkills: vi.fn().mockResolvedValue([{ id: "skill-1" }]),
    updateSkill: vi.fn().mockResolvedValue({ id: "skill-1", name: "TS" }),
    deleteSkill: vi.fn().mockResolvedValue({ deleted: true }),
    setCourseSkills: vi.fn().mockResolvedValue([{ id: "cs-1" }]),
    getCourseSkills: vi.fn().mockResolvedValue([{ id: "cs-1" }]),
    getUserSkills: vi.fn().mockResolvedValue([{ id: "us-1" }]),
    awardXp: vi.fn().mockResolvedValue({ id: "xp-1", amount: 10 }),
    getXpHistory: vi.fn().mockResolvedValue({ data: [{ id: "xp-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 }, totalXp: 10 }),
    getLeaderboard: vi.fn().mockResolvedValue([{ rank: 1, userId: "u-1" }]),
    takeSnapshot: vi.fn().mockResolvedValue({ id: "snap-1" }),
    createAchievement: vi.fn().mockResolvedValue({ id: "ach-1" }),
    listAchievements: vi.fn().mockResolvedValue([{ id: "ach-1" }]),
    getUserAchievements: vi.fn().mockResolvedValue([{ id: "ua-1" }]),
    ...overrides,
  };
  return { controller: new GamificationController(gamification as any), gamification };
}

function createRequest(organization = org, u: any = user) {
  return { organization, user: u } as any;
}

describe("GamificationController", () => {
  it("manages skills: create, list, update, delete", async () => {
    const { controller, gamification } = setup();
    const req = createRequest();

    const createResult = await controller.createSkill(req, { name: "JS" } as any);
    expect(gamification.createSkill).toHaveBeenCalledWith(org, expect.objectContaining({ name: "JS" }));
    expect(createResult).toEqual({ data: { id: "skill-1", name: "JS" } });

    await controller.listSkills(req, "tech");
    expect(gamification.listSkills).toHaveBeenCalledWith(org, "tech");

    await controller.updateSkill(req, "skill-1", { name: "TS" } as any);
    expect(gamification.updateSkill).toHaveBeenCalledWith(org, "skill-1", expect.objectContaining({ name: "TS" }));

    const deleteResult = await controller.deleteSkill(req, "skill-1");
    expect(gamification.deleteSkill).toHaveBeenCalledWith(org, "skill-1");
    expect(deleteResult).toEqual({ deleted: true });
  });

  it("attaches skills to a course and lists them", async () => {
    const { controller, gamification } = setup();
    const req = createRequest();

    const setResult = await controller.setCourseSkills(req, "c-1", [{ skillId: "skill-1" } as any]);
    expect(gamification.setCourseSkills).toHaveBeenCalledWith(org, "c-1", expect.arrayContaining([expect.objectContaining({ skillId: "skill-1" })]));
    expect(setResult).toEqual({ data: [{ id: "cs-1" }] });

    const listResult = await controller.getCourseSkills("c-1");
    expect(gamification.getCourseSkills).toHaveBeenCalledWith("c-1");
    expect(listResult).toEqual({ data: [{ id: "cs-1" }] });
  });

  it("returns the current user's skills", async () => {
    const { controller, gamification } = setup();
    const result = await controller.mySkills(createRequest());
    expect(gamification.getUserSkills).toHaveBeenCalledWith(org, "u-1");
    expect(result).toEqual({ data: [{ id: "us-1" }] });
  });

  it("awards XP and returns xp history (raw, not wrapped)", async () => {
    const { controller, gamification } = setup();
    const req = createRequest();

    const awardResult = await controller.awardXp(req, { userId: "u-2", amount: 10, reason: "lesson_complete" } as any);
    expect(gamification.awardXp).toHaveBeenCalledWith(org, "u-2", 10, "lesson_complete", undefined, undefined);
    expect(awardResult).toEqual({ data: { id: "xp-1", amount: 10 } });

    const history = await controller.myXp(req, { page: 1 } as any);
    expect(gamification.getXpHistory).toHaveBeenCalledWith(org, "u-1", expect.objectContaining({ page: 1 }));
    expect(history).toEqual({ data: [{ id: "xp-1" }], meta: { page: 1, limit: 20, total: 1, totalPages: 1 }, totalXp: 10 });
  });

  it("returns leaderboard and takes snapshots", async () => {
    const { controller, gamification } = setup();
    const req = createRequest();

    const leaderboard = await controller.getLeaderboard(req, { period: "ALL_TIME" } as any);
    expect(gamification.getLeaderboard).toHaveBeenCalledWith(org, expect.objectContaining({ period: "ALL_TIME" }));
    expect(leaderboard).toEqual({ data: [{ rank: 1, userId: "u-1" }] });

    const snapshot = await controller.takeSnapshot(req, { period: "WEEKLY" } as any);
    expect(gamification.takeSnapshot).toHaveBeenCalledWith(org, "WEEKLY", undefined);
    expect(snapshot).toEqual({ data: { id: "snap-1" } });
  });

  it("manages achievements: create, list, mine", async () => {
    const { controller, gamification } = setup();
    const req = createRequest();

    const createResult = await controller.createAchievement(req, { key: "first_course", name: "First Course" } as any);
    expect(gamification.createAchievement).toHaveBeenCalledWith(org, expect.objectContaining({ key: "first_course" }));
    expect(createResult).toEqual({ data: { id: "ach-1" } });

    const list = await controller.listAchievements(req);
    expect(gamification.listAchievements).toHaveBeenCalledWith(org);
    expect(list).toEqual({ data: [{ id: "ach-1" }] });

    const mine = await controller.myAchievements(req);
    expect(gamification.getUserAchievements).toHaveBeenCalledWith("u-1");
    expect(mine).toEqual({ data: [{ id: "ua-1" }] });
  });

  it("propagates not found errors from the service", async () => {
    const { controller } = setup({
      updateSkill: vi.fn().mockRejectedValue(new NotFoundException("Skill not found")),
    });
    await expect(controller.updateSkill(createRequest(), "missing", { name: "X" } as any)).rejects.toBeInstanceOf(NotFoundException);
  });
});
