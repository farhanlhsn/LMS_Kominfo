import { Controller, Get, Post, Patch, Delete, Body, Param, Query, Inject, UseGuards, Req } from "@nestjs/common";
import { PERMISSIONS } from "@lms/shared";
import type { AuthenticatedRequest } from "../auth/types/authenticated-request";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { Permissions } from "../rbac/decorators/permissions.decorator";
import { GamificationService } from "./gamification.service";
import type { CreateSkillDto, UpdateSkillDto, CourseSkillDto, XpQueryDto, LeaderboardQueryDto, CreateAchievementDto, UpdateAchievementDto } from "./dto/gamification.dto";

@Controller()
@UseGuards(JwtAuthGuard, OrganizationContextGuard)
export class GamificationController {
  constructor(
    @Inject(GamificationService) private readonly gamification: GamificationService
  ) {}

  // ── Skills ──────────────────────────────────────────

  @Post("skills")
  @Permissions(PERMISSIONS.coursesUpdate)
  async createSkill(@Req() req: AuthenticatedRequest, @Body() dto: CreateSkillDto) {
    return { data: await this.gamification.createSkill(req.organization!, dto) };
  }

  @Get("skills")
  async listSkills(@Req() req: AuthenticatedRequest, @Query("category") category?: string) {
    return { data: await this.gamification.listSkills(req.organization!, category) };
  }

  @Patch("skills/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  async updateSkill(@Req() req: AuthenticatedRequest, @Param("id") id: string, @Body() dto: UpdateSkillDto) {
    return { data: await this.gamification.updateSkill(req.organization!, id, dto) };
  }

  @Delete("skills/:id")
  @Permissions(PERMISSIONS.coursesUpdate)
  async deleteSkill(@Req() req: AuthenticatedRequest, @Param("id") id: string) {
    return await this.gamification.deleteSkill(req.organization!, id);
  }

  @Post("courses/:courseId/skills")
  @Permissions(PERMISSIONS.coursesUpdate)
  async setCourseSkills(@Req() req: AuthenticatedRequest, @Param("courseId") courseId: string, @Body() skills: CourseSkillDto[]) {
    return { data: await this.gamification.setCourseSkills(req.organization!, courseId, skills) };
  }

  @Get("courses/:courseId/skills")
  async getCourseSkills(@Param("courseId") courseId: string) {
    return { data: await this.gamification.getCourseSkills(courseId) };
  }

  @Get("skills/mine")
  async mySkills(@Req() req: AuthenticatedRequest) {
    return { data: await this.gamification.getUserSkills(req.organization!, req.user.id) };
  }

  // ── XP ──────────────────────────────────────────────

  @Post("xp/award")
  @Permissions(PERMISSIONS.analyticsView)
  async awardXp(@Req() req: AuthenticatedRequest, @Body() body: { userId: string; amount: number; reason: string; sourceType?: string; sourceId?: string }) {
    return { data: await this.gamification.awardXp(req.organization!, body.userId, body.amount, body.reason, body.sourceType, body.sourceId) };
  }

  @Get("xp/mine")
  async myXp(@Req() req: AuthenticatedRequest, @Query() query: XpQueryDto) {
    return this.gamification.getXpHistory(req.organization!, req.user.id, query);
  }

  // ── Leaderboard ─────────────────────────────────────

  @Get("leaderboard")
  async getLeaderboard(@Req() req: AuthenticatedRequest, @Query() query: LeaderboardQueryDto) {
    return { data: await this.gamification.getLeaderboard(req.organization!, query) };
  }

  @Post("leaderboard/snapshot")
  @Permissions(PERMISSIONS.analyticsView)
  async takeSnapshot(@Req() req: AuthenticatedRequest, @Body() body: { period: string; courseId?: string }) {
    return { data: await this.gamification.takeSnapshot(req.organization!, body.period, body.courseId) };
  }

  // ── Achievements ────────────────────────────────────

  @Post("achievements")
  @Permissions(PERMISSIONS.analyticsView)
  async createAchievement(@Req() req: AuthenticatedRequest, @Body() dto: CreateAchievementDto) {
    return { data: await this.gamification.createAchievement(req.organization!, dto) };
  }

  @Get("achievements")
  async listAchievements(@Req() req: AuthenticatedRequest) {
    return { data: await this.gamification.listAchievements(req.organization!) };
  }

  @Get("achievements/mine")
  async myAchievements(@Req() req: AuthenticatedRequest) {
    return { data: await this.gamification.getUserAchievements(req.user.id) };
  }
}
