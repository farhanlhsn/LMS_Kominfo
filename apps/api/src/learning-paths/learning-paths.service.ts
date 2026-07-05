import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type { CreateLearningPathDto, UpdateLearningPathDto, AddCourseToPathDto, LearningPathQueryDto } from "./dto/learning-path.dto";

const ADMIN_ROLES = new Set(["org_admin", "course_manager"]);

@Injectable()
export class LearningPathsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService
  ) {}

  private paginationMeta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private slugify(value: string) {
    return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }

  // ── CRUD ──────────────────────────────────────────────

  async create(org: OrganizationContext, dto: CreateLearningPathDto) {
    const slug = this.slugify(dto.title);
    const existing = await this.prisma.learningPath.findUnique({ where: { organizationId_slug: { organizationId: org.id, slug } } });
    if (existing) throw new BadRequestException("A learning path with this title already exists");
    return this.prisma.learningPath.create({
      data: {
        organizationId: org.id,
        title: dto.title,
        slug,
        description: dto.description,
        difficulty: dto.difficulty as any,
        durationHours: dto.durationHours ?? 0,
      },
      include: { courses: true },
    });
  }

  async findAll(org: OrganizationContext, query: LearningPathQueryDto) {
    const where: Record<string, unknown> = { organizationId: org.id };
    if (query.status) where.status = query.status;
    if (query.search) where.title = { contains: query.search, mode: "insensitive" };
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const [data, total] = await Promise.all([
      this.prisma.learningPath.findMany({
        where: where as any,
        include: { _count: { select: { courses: true, enrollments: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.learningPath.count({ where: where as any }),
    ]);
    return { data, meta: this.paginationMeta(page, limit, total) };
  }

  async findOne(org: OrganizationContext, idOrSlug: string) {
    const path = await this.prisma.learningPath.findFirst({
      where: { organizationId: org.id, OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
      include: {
        courses: { include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true, level: true } } }, orderBy: { orderIndex: "asc" } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!path) throw new NotFoundException("Learning path not found");
    return path;
  }

  async update(org: OrganizationContext, id: string, dto: UpdateLearningPathDto) {
    await this.findOne(org, id);
    return this.prisma.learningPath.update({
      where: { id },
      data: {
        ...(dto.title ? { title: dto.title, slug: this.slugify(dto.title) } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.difficulty ? { difficulty: dto.difficulty as any } : {}),
        ...(dto.durationHours !== undefined ? { durationHours: dto.durationHours } : {}),
        ...(dto.status ? { status: dto.status as any } : {}),
      },
      include: { courses: true },
    });
  }

  async delete(org: OrganizationContext, id: string) {
    await this.findOne(org, id);
    await this.prisma.learningPath.delete({ where: { id } });
    return { deleted: true };
  }

  // ── Course management ─────────────────────────────────

  async addCourse(org: OrganizationContext, id: string, dto: AddCourseToPathDto) {
    await this.findOne(org, id);
    const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, organizationId: org.id, deletedAt: null } });
    if (!course) throw new BadRequestException("Course not found in this organization");
    const existing = await this.prisma.learningPathCourse.findUnique({ where: { learningPathId_courseId: { learningPathId: id, courseId: dto.courseId } } });
    if (existing) throw new BadRequestException("Course already in this learning path");
    return this.prisma.learningPathCourse.create({
      data: { learningPathId: id, courseId: dto.courseId, orderIndex: dto.orderIndex ?? 0, required: dto.required ?? true },
      include: { course: { select: { id: true, title: true, slug: true } } },
    });
  }

  async removeCourse(org: OrganizationContext, id: string, courseId: string) {
    await this.findOne(org, id);
    const entry = await this.prisma.learningPathCourse.findUnique({ where: { learningPathId_courseId: { learningPathId: id, courseId } } });
    if (!entry) throw new NotFoundException("Course not in this learning path");
    await this.prisma.learningPathCourse.delete({ where: { id: entry.id } });
    return { deleted: true };
  }

  async reorderCourses(org: OrganizationContext, id: string, courseIds: string[]) {
    await this.findOne(org, id);
    await Promise.all(
      courseIds.map((courseId, index) =>
        this.prisma.learningPathCourse.updateMany({
          where: { learningPathId: id, courseId },
          data: { orderIndex: index },
        })
      )
    );
    return this.prisma.learningPathCourse.findMany({ where: { learningPathId: id }, orderBy: { orderIndex: "asc" } });
  }

  // ── Enrollment ────────────────────────────────────────

  async enroll(org: OrganizationContext, userId: string, learningPathId: string) {
    await this.findOne(org, learningPathId);
    const existing = await this.prisma.learningPathEnrollment.findUnique({
      where: { organizationId_learningPathId_userId: { organizationId: org.id, learningPathId, userId } },
    });
    if (existing) return existing;
    const enrollment = await this.prisma.learningPathEnrollment.create({
      data: { organizationId: org.id, learningPathId, userId },
    });
    await this.prisma.learningPath.update({ where: { id: learningPathId }, data: { enrolledCount: { increment: 1 } } });
    return enrollment;
  }

  async getEnrollments(org: OrganizationContext, userId: string) {
    return this.prisma.learningPathEnrollment.findMany({
      where: { organizationId: org.id, userId },
      include: { learningPath: true },
      orderBy: { enrolledAt: "desc" },
    });
  }

  async updateProgress(org: OrganizationContext, userId: string, learningPathId: string) {
    const path = await this.findOne(org, learningPathId);
    const courseIds = path.courses.map((pc) => pc.courseId);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { organizationId: org.id, userId, courseId: { in: courseIds } },
    });
    const completed = enrollments.filter((e) => e.status === "COMPLETED").length;
    const total = path.courses.length;
    const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;
    const status = completed >= total ? "COMPLETED" : "ACTIVE";
    return this.prisma.learningPathEnrollment.update({
      where: { organizationId_learningPathId_userId: { organizationId: org.id, learningPathId, userId } },
      data: { progressPercent, status: status as any, completedAt: status === "COMPLETED" ? new Date() : undefined },
    });
  }
}
