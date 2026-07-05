import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  AddCohortMemberDto,
  BatchCreateCohortScheduleDto,
  CohortStatus,
  CreateCohortDto,
  CreateCohortScheduleDto,
  UpdateCohortDto,
  UpdateUserTimezoneDto,
} from "./dto/scheduling.dto";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class SchedulingService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  // ============================================================
  // Cohort CRUD
  // ============================================================

  async listCohorts(
    organization: OrganizationContext,
    userId: string,
    filters: { courseId?: string; status?: CohortStatus } = {},
  ) {
    await this.ensureCanManageOrg(organization, userId);
    return this.prisma.cohort.findMany({
      where: {
        organizationId: organization.id,
        ...(filters.courseId ? { courseId: filters.courseId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        schedule: true,
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { members: true, schedule: true } },
      },
      orderBy: { startAt: "asc" },
    });
  }

  async listMyCohorts(organizationId: string, userId: string) {
    return this.prisma.cohort.findMany({
      where: {
        organizationId,
        members: { some: { userId, status: "ACTIVE" } },
      },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        _count: { select: { members: true } },
      },
      orderBy: { startAt: "asc" },
    });
  }

  async getCohort(organization: OrganizationContext, userId: string, cohortId: string) {
    const cohort = await this.prisma.cohort.findFirst({
      where: { id: cohortId, organizationId: organization.id },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
        schedule: { orderBy: [{ weekday: "asc" }, { startTime: "asc" }] },
        course: { select: { id: true, title: true, slug: true } },
      },
    });
    if (!cohort) throw new NotFoundException("Cohort not found");
    await this.ensureCanManageOrg(organization, userId);
    return cohort;
  }

  async createCohort(
    organization: OrganizationContext,
    userId: string,
    dto: CreateCohortDto,
  ) {
    await this.ensureCanManageOrg(organization, userId);
    this.validateCohortDates(dto.startAt, dto.endAt);
    await this.ensureCourseExists(organization.id, dto.courseId);
    const cohort = await this.prisma.cohort.create({
      data: {
        organizationId: organization.id,
        name: dto.name,
        courseId: dto.courseId,
        startAt: new Date(dto.startAt),
        endAt: new Date(dto.endAt),
        timezone: dto.timezone ?? "UTC",
        maxSeats: dto.maxSeats ?? 0,
        status: dto.status ?? "PLANNED",
        metadata: {} as Prisma.InputJsonObject,
      },
    });
    await this.audit(organization.id, userId, "cohort.created", cohort.id);
    return cohort;
  }

  async updateCohort(
    organization: OrganizationContext,
    userId: string,
    cohortId: string,
    dto: UpdateCohortDto,
  ) {
    const cohort = await this.getCohort(organization, userId, cohortId);
    if (dto.startAt && dto.endAt) {
      this.validateCohortDates(dto.startAt, dto.endAt);
    } else if (dto.startAt || dto.endAt) {
      const start = dto.startAt ?? cohort.startAt.toISOString();
      const end = dto.endAt ?? cohort.endAt.toISOString();
      this.validateCohortDates(start, end);
    }
    const updated = await this.prisma.cohort.update({
      where: { id: cohort.id },
      data: {
        name: dto.name,
        startAt: dto.startAt ? new Date(dto.startAt) : undefined,
        endAt: dto.endAt ? new Date(dto.endAt) : undefined,
        timezone: dto.timezone,
        maxSeats: dto.maxSeats,
        status: dto.status,
      },
    });
    await this.audit(organization.id, userId, "cohort.updated", updated.id);
    return updated;
  }

  async deleteCohort(
    organization: OrganizationContext,
    userId: string,
    cohortId: string,
  ) {
    const cohort = await this.getCohort(organization, userId, cohortId);
    await this.prisma.cohort.delete({ where: { id: cohort.id } });
    await this.audit(organization.id, userId, "cohort.deleted", cohortId);
    return { id: cohortId };
  }

  // ============================================================
  // Cohort members
  // ============================================================

  async addMember(
    organization: OrganizationContext,
    userId: string,
    cohortId: string,
    dto: AddCohortMemberDto,
  ) {
    const cohort = await this.getCohort(organization, userId, cohortId);
    if (cohort.maxSeats > 0) {
      const current = await this.prisma.cohortMember.count({
        where: { cohortId: cohort.id, status: "ACTIVE" },
      });
      if (current >= cohort.maxSeats) {
        throw new BadRequestException("Cohort is at maximum capacity");
      }
    }
    const existing = await this.prisma.cohortMember.findFirst({
      where: { cohortId: cohort.id, userId: dto.userId },
    });
    if (existing) {
      throw new ConflictException("User is already a member of this cohort");
    }
    const member = await this.prisma.cohortMember.create({
      data: {
        organizationId: organization.id,
        cohortId: cohort.id,
        userId: dto.userId,
        status: dto.status ?? "ACTIVE",
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    await this.audit(organization.id, userId, "cohort.member_added", member.id);
    return member;
  }

  async removeMember(
    organization: OrganizationContext,
    userId: string,
    cohortId: string,
    memberUserId: string,
  ) {
    const cohort = await this.getCohort(organization, userId, cohortId);
    const member = await this.prisma.cohortMember.findFirst({
      where: { cohortId: cohort.id, userId: memberUserId },
    });
    if (!member) throw new NotFoundException("Cohort member not found");
    await this.prisma.cohortMember.update({
      where: { id: member.id },
      data: { status: "WITHDRAWN" },
    });
    await this.audit(
      organization.id,
      userId,
      "cohort.member_removed",
      member.id,
    );
    return { id: member.id };
  }

  // ============================================================
  // Cohort schedule
  // ============================================================

  async listSchedule(organization: OrganizationContext, cohortId: string) {
    return this.prisma.cohortSchedule.findMany({
      where: { organizationId: organization.id, cohortId },
      orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
    });
  }

  async addSchedule(
    organization: OrganizationContext,
    userId: string,
    cohortId: string,
    dto: CreateCohortScheduleDto,
  ) {
    await this.getCohort(organization, userId, cohortId);
    this.validateScheduleTimes(dto.startTime, dto.endTime);
    const created = await this.prisma.cohortSchedule.create({
      data: {
        organizationId: organization.id,
        cohortId,
        weekday: dto.weekday,
        startTime: dto.startTime,
        endTime: dto.endTime,
        lessonId: dto.lessonId,
        meetingUrl: dto.meetingUrl,
      },
    });
    await this.audit(organization.id, userId, "cohort.schedule_added", created.id);
    return created;
  }

  async batchAddSchedule(
    organization: OrganizationContext,
    userId: string,
    cohortId: string,
    dto: BatchCreateCohortScheduleDto,
  ) {
    await this.getCohort(organization, userId, cohortId);
    for (const item of dto.items) {
      this.validateScheduleTimes(item.startTime, item.endTime);
    }
    const created = await this.prisma.$transaction(
      dto.items.map((item) =>
        this.prisma.cohortSchedule.create({
          data: {
            organizationId: organization.id,
            cohortId,
            weekday: item.weekday,
            startTime: item.startTime,
            endTime: item.endTime,
            lessonId: item.lessonId,
            meetingUrl: item.meetingUrl,
          },
        }),
      ),
    );
    await this.audit(
      organization.id,
      userId,
      "cohort.schedule_bulk_added",
      cohortId,
    );
    return created;
  }

  // ============================================================
  // User timezone preferences
  // ============================================================

  async getMyTimezone(organizationId: string, userId: string) {
    const preference = await this.prisma.userTimezonePreference.findUnique({
      where: { userId },
    });
    const fallback = await this.prisma.user.findFirst({
      where: { id: userId, memberships: { some: { organizationId } } },
      select: { timezone: true },
    });
    return {
      userId,
      timezone: preference?.timezone ?? fallback?.timezone ?? "UTC",
      autoDetect: preference?.autoDetect ?? false,
      updatedAt: preference?.updatedAt ?? null,
    };
  }

  async updateMyTimezone(
    organizationId: string,
    userId: string,
    dto: UpdateUserTimezoneDto,
  ) {
    if (!dto.timezone) {
      throw new BadRequestException("Timezone is required");
    }
    const updated = await this.prisma.userTimezonePreference.upsert({
      where: { userId },
      update: {
        timezone: dto.timezone,
        autoDetect: dto.autoDetect ?? false,
      },
      create: {
        userId,
        timezone: dto.timezone,
        autoDetect: dto.autoDetect ?? false,
      },
    });
    // Mirror to the User table so other services can read it without joins.
    await this.prisma.user.update({
      where: { id: userId },
      data: { timezone: dto.timezone },
    });
    await this.audit(organizationId, userId, "user.timezone_updated", userId);
    return updated;
  }

  // ============================================================
  // Helpers
  // ============================================================

  convertTimezone(input: Date, fromTz: string, toTz: string): Date {
    if (!fromTz || !toTz) return input;
    try {
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: toTz,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });
      // Determine the wall-clock time at the target zone by formatting the
      // original instant, then constructing a Date from those fields.
      const parts = formatter.formatToParts(input);
      const get = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value ?? 0);
      return new Date(
        Date.UTC(
          get("year"),
          get("month") - 1,
          get("day"),
          get("hour"),
          get("minute"),
          get("second"),
        ),
      );
    } catch {
      return input;
    }
  }

  private validateCohortDates(startAt: string, endAt: string) {
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException("Invalid cohort start/end date");
    }
    if (start >= end) {
      throw new BadRequestException("Cohort startAt must be before endAt");
    }
  }

  private validateScheduleTimes(startTime: string, endTime: string) {
    if (!TIME_PATTERN.test(startTime) || !TIME_PATTERN.test(endTime)) {
      throw new BadRequestException("startTime/endTime must be HH:MM");
    }
    if (startTime >= endTime) {
      throw new BadRequestException("startTime must be before endTime");
    }
  }

  private async ensureCourseExists(organizationId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!course) throw new NotFoundException("Course not found");
  }

  private async ensureCanManageOrg(
    organization: OrganizationContext,
    _userId: string,
  ) {
    if (organization.isPlatformAdmin) return;
    if (!organization.permissionKeys.includes("courses:update")) {
      throw new ForbiddenException("Insufficient cohort permissions");
    }
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
    metadata: Record<string, unknown> = {},
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Scheduling",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
