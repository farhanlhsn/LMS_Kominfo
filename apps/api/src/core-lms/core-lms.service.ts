import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
  CreateActivityDto,
  CreateCourseDto,
  CreateLessonDto,
  CreateModuleDto,
  ReorderDto,
  UpdateActivityDto,
  UpdateActivityProgressDto,
  UpdateCourseDto,
  UpdateLessonDto,
  UpdateModuleDto,
} from "./dto/course.dto";

@Injectable()
export class CoreLmsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async listCategories(organizationId: string): Promise<unknown> {
    return this.prisma.courseCategory.findMany({
      where: { organizationId },
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
    });
  }

  async listCatalog(
    organizationId: string,
    query: { page?: number; limit?: number; search?: string },
  ): Promise<unknown> {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 50);
    const where: Prisma.CourseWhereInput = {
      organizationId,
      status: "PUBLISHED",
      deletedAt: null,
      OR: query.search
        ? [
            { title: { contains: query.search, mode: "insensitive" } },
            { subtitle: { contains: query.search, mode: "insensitive" } },
            { description: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };

    const [courses, total] = await Promise.all([
      this.prisma.course.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: {
              enrollments: true,
              modules: true,
              activities: true,
            },
          },
        },
        orderBy: { publishedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.course.count({ where }),
    ]);

    return {
      data: courses,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCourseDetail(
    organizationId: string,
    slugOrId: string,
  ): Promise<unknown> {
    const course = await this.prisma.course.findFirst({
      where: {
        organizationId,
        deletedAt: null,
        status: "PUBLISHED",
        OR: [{ id: slugOrId }, { slug: slugOrId }],
      },
      include: {
        category: true,
        instructors: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            enrollments: true,
            modules: true,
            lessons: true,
            activities: true,
          },
        },
      },
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  async getCurriculum(
    organizationId: string,
    courseId: string,
  ): Promise<unknown> {
    await this.getCourseOrThrow(organizationId, courseId);
    return this.getCourseCurriculum(organizationId, courseId);
  }

  async createCourse(
    organization: OrganizationContext,
    userId: string,
    dto: CreateCourseDto,
  ): Promise<unknown> {
    const slug = await this.uniqueCourseSlug(
      organization.id,
      dto.slug ?? dto.title,
    );
    const course = await this.prisma.course.create({
      data: {
        organizationId: organization.id,
        categoryId: dto.categoryId,
        title: dto.title,
        slug,
        subtitle: dto.subtitle,
        description: dto.description,
        level: dto.level ?? "ALL_LEVELS",
        visibility: dto.visibility ?? "ORGANIZATION_ONLY",
        status: "DRAFT",
        instructors: {
          create: {
            organizationId: organization.id,
            userId,
            role: "OWNER",
          },
        },
      },
    });

    await this.audit(organization.id, userId, "course.created", course.id);
    return course;
  }

  async listInstructorCourses(
    organizationId: string,
    userId: string,
    isPlatformAdmin: boolean,
  ): Promise<unknown> {
    return this.prisma.course.findMany({
      where: {
        organizationId,
        deletedAt: null,
        ...(isPlatformAdmin
          ? {}
          : {
              instructors: {
                some: { userId },
              },
            }),
      },
      include: {
        category: true,
        instructors: {
          include: { user: true },
        },
        _count: {
          select: {
            modules: true,
            lessons: true,
            activities: true,
            enrollments: true,
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getInstructorCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    return this.prisma.course.findFirstOrThrow({
      where: {
        id: courseId,
        organizationId: organization.id,
        deletedAt: null,
      },
      include: {
        category: true,
        instructors: {
          include: {
            user: true,
          },
        },
        modules: {
          orderBy: { orderIndex: "asc" },
          include: {
            lessons: {
              orderBy: { orderIndex: "asc" },
              include: {
                activities: {
                  orderBy: { orderIndex: "asc" },
                  include: { activityContent: true },
                },
              },
            },
          },
        },
        _count: {
          select: {
            enrollments: true,
            lessons: true,
            activities: true,
          },
        },
      },
    });
  }

  async updateCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
    dto: UpdateCourseDto,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    return this.prisma.course.update({
      where: { id: courseId },
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        description: dto.description,
        categoryId: dto.categoryId,
        level: dto.level,
        visibility: dto.visibility,
      },
    });
  }

  async deleteCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: { deletedAt: new Date() },
    });
    await this.audit(organization.id, userId, "course.deleted", courseId);
    return course;
  }

  async publishCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: "PUBLISHED",
        publishedAt: new Date(),
        archivedAt: null,
      },
    });
    await this.audit(organization.id, userId, "course.published", courseId);
    return course;
  }

  async archiveCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const course = await this.prisma.course.update({
      where: { id: courseId },
      data: {
        status: "ARCHIVED",
        archivedAt: new Date(),
      },
    });
    await this.audit(organization.id, userId, "course.archived", courseId);
    return course;
  }

  async duplicateCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    const source = await this.ensureCanManageCourse(
      organization,
      userId,
      courseId,
    );
    const curriculum = await this.prisma.courseModule.findMany({
      where: { organizationId: organization.id, courseId },
      include: {
        lessons: {
          include: {
            activities: true,
          },
          orderBy: { orderIndex: "asc" },
        },
      },
      orderBy: { orderIndex: "asc" },
    });

    const duplicated = await this.prisma.course.create({
      data: {
        organizationId: organization.id,
        categoryId: source.categoryId,
        title: `${source.title} Copy`,
        slug: await this.uniqueCourseSlug(
          organization.id,
          `${source.slug}-copy`,
        ),
        subtitle: source.subtitle,
        description: source.description,
        level: source.level,
        visibility: "PRIVATE",
        status: "DRAFT",
        learningObjectives: source.learningObjectives ?? [],
        requirements: source.requirements ?? [],
        targetAudience: source.targetAudience ?? [],
        tags: source.tags ?? [],
        metadata: source.metadata ?? {},
        instructors: {
          create: {
            organizationId: organization.id,
            userId,
            role: "OWNER",
          },
        },
      },
    });

    for (const module of curriculum) {
      const newModule = await this.prisma.courseModule.create({
        data: {
          organizationId: organization.id,
          courseId: duplicated.id,
          title: module.title,
          description: module.description,
          orderIndex: module.orderIndex,
          isPublished: false,
        },
      });

      for (const lesson of module.lessons) {
        const newLesson = await this.prisma.lesson.create({
          data: {
            organizationId: organization.id,
            courseId: duplicated.id,
            moduleId: newModule.id,
            title: lesson.title,
            slug: await this.uniqueLessonSlug(duplicated.id, lesson.slug),
            summary: lesson.summary,
            orderIndex: lesson.orderIndex,
            isPreview: lesson.isPreview,
            isPublished: false,
            estimatedMinutes: lesson.estimatedMinutes,
            metadata: lesson.metadata ?? {},
          },
        });

        for (const activity of lesson.activities) {
          await this.prisma.activity.create({
            data: {
              organizationId: organization.id,
              courseId: duplicated.id,
              lessonId: newLesson.id,
              title: activity.title,
              description: activity.description,
              activityTypeKey: activity.activityTypeKey,
              pluginKey: activity.pluginKey,
              pluginVersion: activity.pluginVersion,
              orderIndex: activity.orderIndex,
              isRequired: activity.isRequired,
              isPublished: false,
              estimatedMinutes: activity.estimatedMinutes,
              config: activity.config ?? {},
              content: activity.content ?? {},
              completionRule: activity.completionRule ?? {},
              gradingRule: activity.gradingRule ?? undefined,
              metadata: activity.metadata ?? {},
            },
          });
        }
      }
    }

    return duplicated;
  }

  async createModule(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
    dto: CreateModuleDto,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const orderIndex = await this.prisma.courseModule.count({
      where: { organizationId: organization.id, courseId },
    });
    return this.prisma.courseModule.create({
      data: {
        organizationId: organization.id,
        courseId,
        title: dto.title,
        description: dto.description,
        orderIndex,
      },
    });
  }

  async updateModule(
    organization: OrganizationContext,
    userId: string,
    moduleId: string,
    dto: UpdateModuleDto,
  ): Promise<unknown> {
    const module = await this.getModuleOrThrow(organization.id, moduleId);
    await this.ensureCanManageCourse(organization, userId, module.courseId);
    return this.prisma.courseModule.update({
      where: { id: moduleId },
      data: dto,
    });
  }

  async deleteModule(
    organization: OrganizationContext,
    userId: string,
    moduleId: string,
  ): Promise<unknown> {
    const module = await this.getModuleOrThrow(organization.id, moduleId);
    await this.ensureCanManageCourse(organization, userId, module.courseId);
    return this.prisma.courseModule.delete({ where: { id: moduleId } });
  }

  async reorderModules(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
    dto: ReorderDto,
  ): Promise<unknown> {
    await this.ensureCanManageCourse(organization, userId, courseId);
    await Promise.all(
      dto.ids.map((id, orderIndex) =>
        this.prisma.courseModule.updateMany({
          where: { id, organizationId: organization.id, courseId },
          data: { orderIndex },
        }),
      ),
    );
    return this.getCourseCurriculum(organization.id, courseId);
  }

  async createLesson(
    organization: OrganizationContext,
    userId: string,
    moduleId: string,
    dto: CreateLessonDto,
  ): Promise<unknown> {
    const module = await this.getModuleOrThrow(organization.id, moduleId);
    await this.ensureCanManageCourse(organization, userId, module.courseId);
    const orderIndex = await this.prisma.lesson.count({
      where: { organizationId: organization.id, moduleId },
    });
    return this.prisma.lesson.create({
      data: {
        organizationId: organization.id,
        courseId: module.courseId,
        moduleId,
        title: dto.title,
        slug: await this.uniqueLessonSlug(
          module.courseId,
          dto.slug ?? dto.title,
        ),
        summary: dto.summary,
        orderIndex,
        estimatedMinutes: dto.estimatedMinutes ?? 0,
      },
    });
  }

  async updateLesson(
    organization: OrganizationContext,
    userId: string,
    lessonId: string,
    dto: UpdateLessonDto,
  ): Promise<unknown> {
    const lesson = await this.getLessonOrThrow(organization.id, lessonId);
    await this.ensureCanManageCourse(organization, userId, lesson.courseId);
    return this.prisma.lesson.update({
      where: { id: lessonId },
      data: dto,
    });
  }

  async deleteLesson(
    organization: OrganizationContext,
    userId: string,
    lessonId: string,
  ): Promise<unknown> {
    const lesson = await this.getLessonOrThrow(organization.id, lessonId);
    await this.ensureCanManageCourse(organization, userId, lesson.courseId);
    return this.prisma.lesson.delete({ where: { id: lessonId } });
  }

  async reorderLessons(
    organization: OrganizationContext,
    userId: string,
    moduleId: string,
    dto: ReorderDto,
  ): Promise<unknown> {
    const module = await this.getModuleOrThrow(organization.id, moduleId);
    await this.ensureCanManageCourse(organization, userId, module.courseId);
    await Promise.all(
      dto.ids.map((id, orderIndex) =>
        this.prisma.lesson.updateMany({
          where: { id, organizationId: organization.id, moduleId },
          data: { orderIndex },
        }),
      ),
    );
    return this.getCourseCurriculum(organization.id, module.courseId);
  }

  async createActivity(
    organization: OrganizationContext,
    userId: string,
    lessonId: string,
    dto: CreateActivityDto,
  ): Promise<unknown> {
    const lesson = await this.getLessonOrThrow(organization.id, lessonId);
    await this.ensureCanManageCourse(organization, userId, lesson.courseId);
    const orderIndex = await this.prisma.activity.count({
      where: { organizationId: organization.id, lessonId },
    });
    return this.prisma.activity.create({
      data: {
        organizationId: organization.id,
        courseId: lesson.courseId,
        lessonId,
        title: dto.title,
        description: dto.description,
        activityTypeKey: dto.activityTypeKey,
        orderIndex,
        isRequired: dto.isRequired ?? true,
        isPublished: true,
        content: (dto.content ?? {}) as Prisma.InputJsonObject,
        completionRule: { type: "manual" },
        activityContent: {
          create: {
            organizationId: organization.id,
            body: (dto.content ?? {}) as Prisma.InputJsonObject,
            resources: [],
          },
        },
      },
    });
  }

  async updateActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
    dto: UpdateActivityDto,
  ): Promise<unknown> {
    const activity = await this.getActivityOrThrow(organization.id, activityId);
    await this.ensureCanManageCourse(organization, userId, activity.courseId);
    return this.prisma.activity.update({
      where: { id: activityId },
      data: {
        title: dto.title,
        description: dto.description,
        isRequired: dto.isRequired,
        isPublished: dto.isPublished,
        content: dto.content
          ? (dto.content as Prisma.InputJsonObject)
          : undefined,
        activityContent: dto.content
          ? {
              upsert: {
                update: { body: dto.content as Prisma.InputJsonObject },
                create: {
                  organizationId: organization.id,
                  body: dto.content as Prisma.InputJsonObject,
                  resources: [],
                },
              },
            }
          : undefined,
      },
    });
  }

  async deleteActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ): Promise<unknown> {
    const activity = await this.getActivityOrThrow(organization.id, activityId);
    await this.ensureCanManageCourse(organization, userId, activity.courseId);
    return this.prisma.activity.delete({ where: { id: activityId } });
  }

  async reorderActivities(
    organization: OrganizationContext,
    userId: string,
    lessonId: string,
    dto: ReorderDto,
  ): Promise<unknown> {
    const lesson = await this.getLessonOrThrow(organization.id, lessonId);
    await this.ensureCanManageCourse(organization, userId, lesson.courseId);
    await Promise.all(
      dto.ids.map((id, orderIndex) =>
        this.prisma.activity.updateMany({
          where: { id, organizationId: organization.id, lessonId },
          data: { orderIndex },
        }),
      ),
    );
    return this.getCourseCurriculum(organization.id, lesson.courseId);
  }

  async enroll(
    organizationId: string,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    const course = await this.prisma.course.findFirst({
      where: {
        id: courseId,
        organizationId,
        status: "PUBLISHED",
        deletedAt: null,
      },
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    const enrollment = await this.prisma.enrollment.upsert({
      where: {
        organizationId_courseId_userId: {
          organizationId,
          courseId,
          userId,
        },
      },
      update: {
        status: "ACTIVE",
        lastAccessedAt: new Date(),
      },
      create: {
        organizationId,
        courseId,
        userId,
        status: "ACTIVE",
        lastAccessedAt: new Date(),
      },
    });

    await this.learningEvent(
      organizationId,
      userId,
      courseId,
      null,
      null,
      "course.enrolled",
    );
    return enrollment;
  }

  async myEnrollments(
    organizationId: string,
    userId: string,
  ): Promise<unknown> {
    return this.prisma.enrollment.findMany({
      where: {
        organizationId,
        userId,
        course: {
          deletedAt: null,
        },
      },
      include: {
        course: {
          include: {
            category: true,
            modules: {
              orderBy: { orderIndex: "asc" },
              include: {
                lessons: {
                  orderBy: { orderIndex: "asc" },
                  include: {
                    activities: {
                      orderBy: { orderIndex: "asc" },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { lastAccessedAt: "desc" },
    });
  }

  async courseProgress(
    organizationId: string,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    await this.ensureEnrollment(organizationId, userId, courseId);
    return this.calculateCourseProgress(organizationId, userId, courseId);
  }

  async learnCourse(
    organizationId: string,
    userId: string,
    courseId: string,
  ): Promise<unknown> {
    const enrollment = await this.ensureEnrollment(
      organizationId,
      userId,
      courseId,
    );
    const curriculum = await this.getCourseCurriculum(
      organizationId,
      courseId,
      userId,
    );
    const progress = await this.calculateCourseProgress(
      organizationId,
      userId,
      courseId,
    );
    return {
      enrollment,
      curriculum,
      progress,
    };
  }

  async learnLesson(
    organizationId: string,
    userId: string,
    lessonId: string,
  ): Promise<unknown> {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, organizationId },
      include: {
        course: true,
        activities: {
          include: {
            activityContent: true,
            progress: {
              where: { organizationId, userId },
              orderBy: { updatedAt: "desc" },
            },
          },
          orderBy: { orderIndex: "asc" },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    await this.ensureEnrollment(organizationId, userId, lesson.courseId);
    return lesson;
  }

  async startActivity(
    organizationId: string,
    userId: string,
    activityId: string,
  ): Promise<unknown> {
    const activity = await this.getActivityOrThrow(organizationId, activityId);
    const enrollment = await this.ensureEnrollment(
      organizationId,
      userId,
      activity.courseId,
    );
    const now = new Date();
    const progress = await this.prisma.activityProgress.upsert({
      where: {
        organizationId_userId_activityId: {
          organizationId,
          userId,
          activityId,
        },
      },
      update: {
        status: "IN_PROGRESS",
        startedAt: now,
        lastAccessedAt: now,
        enrollmentId: enrollment.id,
      },
      create: {
        organizationId,
        userId,
        courseId: activity.courseId,
        lessonId: activity.lessonId,
        activityId,
        enrollmentId: enrollment.id,
        status: "IN_PROGRESS",
        progressPercent: 0,
        startedAt: now,
        lastAccessedAt: now,
      },
    });
    await this.touchEnrollment(enrollment.id, activityId);
    await this.learningEvent(
      organizationId,
      userId,
      activity.courseId,
      activity.lessonId,
      activityId,
      "activity.started",
    );
    return progress;
  }

  async completeActivity(
    organizationId: string,
    userId: string,
    activityId: string,
  ): Promise<unknown> {
    const activity = await this.getActivityOrThrow(organizationId, activityId);
    if (activity.activityTypeKey === "core.quiz") {
      const passedAttempt = await this.prisma.quizAttempt.findFirst({
        where: {
          organizationId,
          userId,
          activityId,
          passed: true,
          status: { in: ["SUBMITTED", "GRADED"] },
        },
      });
      if (!passedAttempt) {
        throw new ForbiddenException("Passing quiz attempt is required");
      }
    }
    const enrollment = await this.ensureEnrollment(
      organizationId,
      userId,
      activity.courseId,
    );
    const now = new Date();
    const progress = await this.prisma.activityProgress.upsert({
      where: {
        organizationId_userId_activityId: {
          organizationId,
          userId,
          activityId,
        },
      },
      update: {
        status: "COMPLETED",
        progressPercent: 100,
        completedAt: now,
        lastAccessedAt: now,
        enrollmentId: enrollment.id,
      },
      create: {
        organizationId,
        userId,
        courseId: activity.courseId,
        lessonId: activity.lessonId,
        activityId,
        enrollmentId: enrollment.id,
        status: "COMPLETED",
        progressPercent: 100,
        startedAt: now,
        completedAt: now,
        lastAccessedAt: now,
      },
    });
    await this.recalculateEnrollment(organizationId, userId, activity.courseId);
    await this.touchEnrollment(enrollment.id, activityId);
    await this.learningEvent(
      organizationId,
      userId,
      activity.courseId,
      activity.lessonId,
      activityId,
      "activity.completed",
    );
    return {
      activityProgress: progress,
      courseProgress: await this.calculateCourseProgress(
        organizationId,
        userId,
        activity.courseId,
      ),
    };
  }

  async updateActivityProgress(
    organizationId: string,
    userId: string,
    activityId: string,
    dto: UpdateActivityProgressDto,
  ): Promise<unknown> {
    const activity = await this.getActivityOrThrow(organizationId, activityId);
    const enrollment = await this.ensureEnrollment(
      organizationId,
      userId,
      activity.courseId,
    );
    const progressPercent = Math.min(dto.progressPercent ?? 0, 99);
    const progress = await this.prisma.activityProgress.upsert({
      where: {
        organizationId_userId_activityId: {
          organizationId,
          userId,
          activityId,
        },
      },
      update: {
        status: progressPercent > 0 ? "IN_PROGRESS" : "NOT_STARTED",
        progressPercent,
        lastAccessedAt: new Date(),
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
      create: {
        organizationId,
        userId,
        courseId: activity.courseId,
        lessonId: activity.lessonId,
        activityId,
        enrollmentId: enrollment.id,
        status: progressPercent > 0 ? "IN_PROGRESS" : "NOT_STARTED",
        progressPercent,
        startedAt: progressPercent > 0 ? new Date() : null,
        lastAccessedAt: new Date(),
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
    await this.touchEnrollment(enrollment.id, activityId);
    return progress;
  }

  private async ensureCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const course = await this.getCourseOrThrow(organization.id, courseId);

    if (organization.isPlatformAdmin) {
      return course;
    }

    const canUpdate = organization.permissionKeys.includes("courses:update");
    const isInstructor = await this.prisma.courseInstructor.findFirst({
      where: {
        organizationId: organization.id,
        courseId,
        userId,
      },
    });

    if (!canUpdate && !isInstructor) {
      throw new ForbiddenException("Insufficient course permissions");
    }

    return course;
  }

  private async getCourseOrThrow(organizationId: string, courseId: string) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId, deletedAt: null },
    });

    if (!course) {
      throw new NotFoundException("Course not found");
    }

    return course;
  }

  private async getModuleOrThrow(organizationId: string, moduleId: string) {
    const module = await this.prisma.courseModule.findFirst({
      where: { id: moduleId, organizationId },
    });

    if (!module) {
      throw new NotFoundException("Module not found");
    }

    return module;
  }

  private async getLessonOrThrow(organizationId: string, lessonId: string) {
    const lesson = await this.prisma.lesson.findFirst({
      where: { id: lessonId, organizationId },
    });

    if (!lesson) {
      throw new NotFoundException("Lesson not found");
    }

    return lesson;
  }

  private async getActivityOrThrow(organizationId: string, activityId: string) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId },
    });

    if (!activity) {
      throw new NotFoundException("Activity not found");
    }

    return activity;
  }

  private async getCourseCurriculum(
    organizationId: string,
    courseId: string,
    userId?: string,
  ) {
    const orderAsc = Prisma.SortOrder.asc;
    const orderDesc = Prisma.SortOrder.desc;

    if (!userId) {
      return this.prisma.course.findFirstOrThrow({
        where: { id: courseId, organizationId, deletedAt: null },
        include: {
          modules: {
            orderBy: { orderIndex: orderAsc },
            include: {
              lessons: {
                orderBy: { orderIndex: orderAsc },
                include: {
                  activities: {
                    orderBy: { orderIndex: orderAsc },
                    include: {
                      activityContent: true,
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    return this.prisma.course.findFirstOrThrow({
      where: { id: courseId, organizationId, deletedAt: null },
      include: {
        modules: {
          orderBy: { orderIndex: orderAsc },
          include: {
            lessons: {
              orderBy: { orderIndex: orderAsc },
              include: {
                activities: {
                  orderBy: { orderIndex: orderAsc },
                  include: {
                    activityContent: true,
                    progress: {
                      where: { organizationId, userId },
                      orderBy: { updatedAt: orderDesc },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  private async ensureEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_courseId_userId: {
          organizationId,
          courseId,
          userId,
        },
      },
    });

    if (!enrollment || enrollment.status !== "ACTIVE") {
      throw new ForbiddenException("Course enrollment is required");
    }

    return enrollment;
  }

  private async calculateCourseProgress(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    const requiredActivities = await this.prisma.activity.findMany({
      where: {
        organizationId,
        courseId,
        isRequired: true,
        isPublished: true,
      },
      select: { id: true },
    });

    if (requiredActivities.length === 0) {
      return { progressPercent: 0, completedRequired: 0, requiredTotal: 0 };
    }

    const completedRequired = await this.prisma.activityProgress.count({
      where: {
        organizationId,
        userId,
        activityId: { in: requiredActivities.map((activity) => activity.id) },
        status: "COMPLETED",
      },
    });
    const progressPercent = Math.round(
      (completedRequired / requiredActivities.length) * 100,
    );

    return {
      progressPercent,
      completedRequired,
      requiredTotal: requiredActivities.length,
    };
  }

  private async recalculateEnrollment(
    organizationId: string,
    userId: string,
    courseId: string,
  ) {
    const progress = await this.calculateCourseProgress(
      organizationId,
      userId,
      courseId,
    );
    await this.prisma.enrollment.update({
      where: {
        organizationId_courseId_userId: {
          organizationId,
          courseId,
          userId,
        },
      },
      data: {
        progressPercent: progress.progressPercent,
        completedAt:
          progress.progressPercent === 100 && progress.requiredTotal > 0
            ? new Date()
            : null,
      },
    });
  }

  private async touchEnrollment(enrollmentId: string, activityId: string) {
    await this.prisma.enrollment.update({
      where: { id: enrollmentId },
      data: {
        lastAccessedAt: new Date(),
        lastActivityId: activityId,
      },
    });
  }

  private async uniqueCourseSlug(organizationId: string, value: string) {
    const base = this.slugify(value);
    let slug = base;
    let suffix = 1;

    while (
      await this.prisma.course.findUnique({
        where: { organizationId_slug: { organizationId, slug } },
      })
    ) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }

    return slug;
  }

  private async uniqueLessonSlug(courseId: string, value: string) {
    const base = this.slugify(value);
    let slug = base;
    let suffix = 1;

    while (
      await this.prisma.lesson.findUnique({
        where: { courseId_slug: { courseId, slug } },
      })
    ) {
      suffix += 1;
      slug = `${base}-${suffix}`;
    }

    return slug;
  }

  private slugify(value: string) {
    return (
      value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || `item-${Date.now()}`
    );
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "Course",
        entityId,
        metadata: {},
      },
    });
  }

  private async learningEvent(
    organizationId: string,
    userId: string,
    courseId: string,
    lessonId: string | null,
    activityId: string | null,
    eventType: string,
  ) {
    await this.prisma.learningEvent.create({
      data: {
        organizationId,
        userId,
        courseId,
        lessonId,
        activityId,
        eventType,
        metadata: {},
      },
    });
  }
}
