import { Inject, Injectable, NotFoundException, ForbiddenException, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type { CreateReviewDto, ModerateReviewDto, AddWishlistDto, FavoriteInstructorDto, ReviewQueryDto } from "./dto/reviews.dto";

const ADMIN_ROLES = new Set(["org_admin", "course_manager"]);

@Injectable()
export class ReviewsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  private paginationMeta(page: number, limit: number, total: number) {
    return { page, limit, total, totalPages: Math.ceil(total / limit) };
  }

  private async ensureEnrolled(org: OrganizationContext, userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_courseId_userId: { organizationId: org.id, courseId, userId } },
    });
    if (!enrollment || enrollment.status !== "COMPLETED") throw new ForbiddenException("You must complete the course before reviewing");
  }

  private async canModerate(org: OrganizationContext, courseId: string) {
    if (org.isPlatformAdmin || org.roleKeys.some((r) => ADMIN_ROLES.has(r))) return true;
    return !!(await this.prisma.courseInstructor.findFirst({ where: { organizationId: org.id, courseId, userId: org.memberId } }));
  }

  // ── Reviews ─────────────────────────────────────────

  async create(org: OrganizationContext, userId: string, dto: CreateReviewDto) {
    const course = await this.prisma.course.findFirst({ where: { id: dto.courseId, organizationId: org.id, deletedAt: null } });
    if (!course) throw new NotFoundException("Course not found");
    await this.ensureEnrolled(org, userId, dto.courseId);
    const existing = await this.prisma.courseReview.findUnique({ where: { organizationId_courseId_userId: { organizationId: org.id, courseId: dto.courseId, userId } } });
    if (existing) throw new BadRequestException("You have already reviewed this course");
    return this.prisma.courseReview.create({
      data: { organizationId: org.id, courseId: dto.courseId, userId, rating: dto.rating, title: dto.title, body: dto.body },
    });
  }

  async update(org: OrganizationContext, userId: string, id: string, dto: CreateReviewDto) {
    const review = await this.prisma.courseReview.findFirst({ where: { id, organizationId: org.id, userId } });
    if (!review) throw new NotFoundException("Review not found");
    return this.prisma.courseReview.update({ where: { id }, data: { rating: dto.rating, title: dto.title, body: dto.body, status: "PENDING" } });
  }

  async delete(org: OrganizationContext, userId: string, id: string) {
    const review = await this.prisma.courseReview.findFirst({ where: { id, organizationId: org.id } });
    if (!review) throw new NotFoundException("Review not found");
    if (review.userId !== userId && !(await this.canModerate(org, review.courseId))) throw new ForbiddenException("Not allowed");
    await this.prisma.courseReview.delete({ where: { id } });
    return { deleted: true };
  }

  async listForCourse(org: OrganizationContext, courseId: string, query: ReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { organizationId: org.id, courseId, status: "APPROVED" };
    const [data, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where: where as any,
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.courseReview.count({ where: where as any }),
    ]);
    const aggregate = await this.prisma.courseReview.aggregate({ where: { organizationId: org.id, courseId, status: "APPROVED" }, _avg: { rating: true }, _count: { rating: true } });
    return { data, meta: this.paginationMeta(page, limit, total), average: aggregate._avg.rating ?? 0, totalReviews: aggregate._count.rating };
  }

  async listModeration(org: OrganizationContext, query: ReviewQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Record<string, unknown> = { organizationId: org.id };
    if (query.status) where.status = query.status; else where.status = { not: "APPROVED" };
    const [data, total] = await Promise.all([
      this.prisma.courseReview.findMany({
        where: where as any,
        include: { user: { select: { id: true, name: true, email: true } }, course: { select: { id: true, title: true, slug: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.courseReview.count({ where: where as any }),
    ]);
    return { data, meta: this.paginationMeta(page, limit, total) };
  }

  async moderate(org: OrganizationContext, userId: string, id: string, dto: ModerateReviewDto) {
    const review = await this.prisma.courseReview.findFirst({ where: { id, organizationId: org.id } });
    if (!review) throw new NotFoundException("Review not found");
    if (!(await this.canModerate(org, review.courseId))) throw new ForbiddenException("Not allowed to moderate");
    return this.prisma.courseReview.update({ where: { id }, data: { status: dto.status as any, moderatedById: userId, moderatedAt: new Date() } });
  }

  // ── Wishlist ────────────────────────────────────────

  async addWishlist(org: OrganizationContext, userId: string, dto: AddWishlistDto) {
    const course = await this.prisma.course.findFirst({
      where: { id: dto.courseId, organizationId: org.id },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException("Course not found");
    }
    return this.prisma.wishlist.upsert({
      where: { organizationId_userId_courseId: { organizationId: org.id, userId, courseId: dto.courseId } },
      update: {},
      create: { organizationId: org.id, userId, courseId: dto.courseId },
    });
  }

  async removeWishlist(org: OrganizationContext, userId: string, courseId: string) {
    const item = await this.prisma.wishlist.findUnique({ where: { organizationId_userId_courseId: { organizationId: org.id, userId, courseId } } });
    if (item) await this.prisma.wishlist.delete({ where: { id: item.id } });
    return { deleted: true };
  }

  async listWishlist(org: OrganizationContext, userId: string) {
    return this.prisma.wishlist.findMany({
      where: { organizationId: org.id, userId },
      include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true, level: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Favorite Instructors ────────────────────────────

  async addFavoriteInstructor(org: OrganizationContext, userId: string, dto: FavoriteInstructorDto) {
    const instructor = await this.prisma.user.findFirst({ where: { id: dto.instructorId } });
    if (!instructor) throw new NotFoundException("Instructor not found");
    return this.prisma.favoriteInstructor.upsert({
      where: { organizationId_userId_instructorId: { organizationId: org.id, userId, instructorId: dto.instructorId } },
      update: {},
      create: { organizationId: org.id, userId, instructorId: dto.instructorId },
    });
  }

  async removeFavoriteInstructor(org: OrganizationContext, userId: string, instructorId: string) {
    const fav = await this.prisma.favoriteInstructor.findUnique({ where: { organizationId_userId_instructorId: { organizationId: org.id, userId, instructorId } } });
    if (fav) await this.prisma.favoriteInstructor.delete({ where: { id: fav.id } });
    return { deleted: true };
  }

  async listFavoriteInstructors(org: OrganizationContext, userId: string) {
    return this.prisma.favoriteInstructor.findMany({
      where: { organizationId: org.id, userId },
      include: { instructor: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  // ── Recently Viewed ─────────────────────────────────

  async trackView(org: OrganizationContext, userId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: org.id },
      select: { id: true },
    });
    if (!course) {
      throw new NotFoundException("Course not found");
    }
    return this.prisma.recentlyViewedCourse.upsert({
      where: { organizationId_userId_courseId: { organizationId: org.id, userId, courseId } },
      update: { viewedAt: new Date() },
      create: { organizationId: org.id, userId, courseId },
    });
  }

  async listRecentlyViewed(org: OrganizationContext, userId: string) {
    return this.prisma.recentlyViewedCourse.findMany({
      where: { organizationId: org.id, userId },
      include: { course: { select: { id: true, title: true, slug: true, thumbnailUrl: true, level: true } } },
      orderBy: { viewedAt: "desc" },
      take: 20,
    });
  }

  // ── Notes Export ────────────────────────────────────

  async exportNotes(org: OrganizationContext, userId: string) {
    const notes = await this.prisma.learnerNote.findMany({
      where: { organizationId: org.id, userId, deletedAt: null },
      include: { course: { select: { title: true } }, lesson: { select: { title: true } } },
      orderBy: { createdAt: "desc" },
    });
    const markdown = notes.map((n) => {
      const header = [`# ${n.course.title}`];
      if (n.lesson?.title) header.push(`## ${n.lesson.title}`);
      if (n.selectedText) header.push(`> ${n.selectedText}`);
      return `${header.join("\n")}\n\n${n.content}\n\n---\n`;
    }).join("\n");
    return { data: { markdown, count: notes.length, format: "markdown" } };
  }
}
