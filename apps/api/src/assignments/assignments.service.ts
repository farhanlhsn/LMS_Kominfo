import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { NotificationService } from "../engagement/notification.service";
import type {
  CreateAssignmentDto,
  CreateRubricDto,
  GradeSubmissionDto,
  ReturnSubmissionDto,
  SaveSubmissionDto,
  UpdateAssignmentDto,
  UpdateRubricDto,
} from "./dto/assignment.dto";

@Injectable()
export class AssignmentsService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService, @Optional() @Inject(NotificationService) private readonly notifications?: NotificationService) {}

  async listAssignments(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    return this.prisma.assignment.findMany({
      where: { organizationId: organization.id, courseId, deletedAt: null },
      include: { activity: true, rubric: true, _count: { select: { submissions: true } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createAssignment(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
    dto: CreateAssignmentDto,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    const activity = dto.activityId
      ? await this.ensureCanManageActivity(organization, userId, dto.activityId)
      : null;
    if (activity && activity.courseId !== courseId) {
      throw new BadRequestException("Activity must belong to the course");
    }
    if (dto.rubricId) {
      await this.ensureCanUseRubric(organization, userId, dto.rubricId, courseId);
    }
    const assignment = await this.prisma.assignment.create({
      data: {
        organizationId: organization.id,
        courseId,
        activityId: dto.activityId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        submissionType: dto.submissionType,
        collaborationMode: dto.collaborationMode ?? "INDIVIDUAL",
        groupMinMembers: dto.groupMinMembers ?? 2,
        groupMaxMembers: dto.groupMaxMembers ?? 5,
        maxResubmissions: dto.maxResubmissions ?? null,
        dueAt: this.date(dto.dueAt),
        availableFrom: this.date(dto.availableFrom),
        availableUntil: this.date(dto.availableUntil),
        allowLateSubmission: dto.allowLateSubmission ?? false,
        latePenaltyPercent: dto.latePenaltyPercent,
        maxAttempts: dto.maxAttempts,
        allowResubmission: dto.allowResubmission ?? false,
        rubricId: dto.rubricId,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
      include: { activity: true, rubric: true },
    });
    if (activity) {
      await this.attachAssignmentActivity(organization.id, activity.id, assignment.id);
    }
    await this.audit(organization.id, userId, "assignment.created", assignment.id);
    return assignment;
  }

  async getInstructorAssignment(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.getAssignment(organization.id, assignmentId);
    await this.ensureCanManageCourse(organization, userId, assignment.courseId);
    return this.assignmentDetail(organization.id, assignmentId);
  }

  async updateAssignment(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
    dto: UpdateAssignmentDto,
  ) {
    const existing = await this.getAssignment(organization.id, assignmentId);
    await this.ensureCanManageCourse(organization, userId, existing.courseId);
    if (dto.activityId) {
      const activity = await this.ensureCanManageActivity(
        organization,
        userId,
        dto.activityId,
      );
      if (activity.courseId !== existing.courseId) {
        throw new BadRequestException("Activity must belong to the course");
      }
    }
    if (dto.rubricId) {
      await this.ensureCanUseRubric(
        organization,
        userId,
        dto.rubricId,
        existing.courseId,
      );
    }
    const assignment = await this.prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: dto.title,
        description: dto.description,
        instructions: dto.instructions,
        activityId: dto.activityId,
        submissionType: dto.submissionType,
        collaborationMode: dto.collaborationMode,
        groupMinMembers: dto.groupMinMembers,
        groupMaxMembers: dto.groupMaxMembers,
        maxResubmissions: dto.maxResubmissions,
        dueAt: this.date(dto.dueAt),
        availableFrom: this.date(dto.availableFrom),
        availableUntil: this.date(dto.availableUntil),
        allowLateSubmission: dto.allowLateSubmission,
        latePenaltyPercent: dto.latePenaltyPercent,
        maxAttempts: dto.maxAttempts,
        allowResubmission: dto.allowResubmission,
        rubricId: dto.rubricId,
        status: dto.status,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
    if (assignment.activityId) {
      await this.attachAssignmentActivity(organization.id, assignment.activityId, assignment.id);
    }
    return this.assignmentDetail(organization.id, assignmentId);
  }

  async deleteAssignment(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.getAssignment(organization.id, assignmentId);
    await this.ensureCanManageCourse(organization, userId, assignment.courseId);
    await this.audit(organization.id, userId, "assignment.deleted", assignmentId);
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  }

  async publishAssignment(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.getAssignment(organization.id, assignmentId);
    await this.ensureCanManageCourse(organization, userId, assignment.courseId);
    if (assignment.activityId) {
      await this.attachAssignmentActivity(organization.id, assignment.activityId, assignment.id);
    }
    await this.audit(organization.id, userId, "assignment.published", assignmentId);
    return this.prisma.assignment.update({
      where: { id: assignmentId },
      data: { status: "PUBLISHED" },
    });
  }

  async listRubrics(organization: OrganizationContext, userId: string) {
    return this.prisma.rubric.findMany({
      where: {
        organizationId: organization.id,
        deletedAt: null,
        ...(organization.isPlatformAdmin
          ? {}
          : {
              OR: [
                { createdById: userId },
                { courseId: null },
                { course: { instructors: { some: { organizationId: organization.id, userId } } } },
              ],
            }),
      },
      include: { criteria: { include: { levels: { orderBy: { orderIndex: "asc" } } }, orderBy: { orderIndex: "asc" } } },
      orderBy: { updatedAt: "desc" },
    });
  }

  async createRubric(
    organization: OrganizationContext,
    userId: string,
    dto: CreateRubricDto,
  ) {
    if (dto.courseId) {
      await this.ensureCanManageCourse(organization, userId, dto.courseId);
    }
    const totalPoints = dto.criteria.reduce((sum, item) => sum + item.maxPoints, 0);
    return this.prisma.rubric.create({
      data: {
        organizationId: organization.id,
        courseId: dto.courseId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        totalPoints,
        status: dto.status ?? "DRAFT",
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
        criteria: {
          create: dto.criteria.map((criterion, index) => ({
            title: criterion.title,
            description: criterion.description,
            maxPoints: criterion.maxPoints,
            orderIndex: criterion.orderIndex ?? index,
            metadata: (criterion.metadata ?? {}) as Prisma.InputJsonObject,
            levels: {
              create: (criterion.levels ?? []).map((level, levelIndex) => ({
                title: level.title,
                description: level.description,
                points: level.points,
                orderIndex: level.orderIndex ?? levelIndex,
              })),
            },
          })),
        },
      },
      include: { criteria: { include: { levels: true } } },
    });
  }

  async getRubric(organization: OrganizationContext, userId: string, rubricId: string) {
    const rubric = await this.prisma.rubric.findFirst({
      where: { id: rubricId, organizationId: organization.id, deletedAt: null },
      include: {
        criteria: {
          include: { levels: { orderBy: { orderIndex: "asc" } } },
          orderBy: { orderIndex: "asc" },
        },
      },
    });
    if (!rubric) throw new NotFoundException("Rubric not found");
    if (rubric.courseId) await this.ensureCanManageCourse(organization, userId, rubric.courseId);
    return rubric;
  }

  async updateRubric(
    organization: OrganizationContext,
    userId: string,
    rubricId: string,
    dto: UpdateRubricDto,
  ) {
    const rubric = await this.getRubric(organization, userId, rubricId);
    if (dto.courseId) await this.ensureCanManageCourse(organization, userId, dto.courseId);
    const criteria = dto.criteria ?? [];
    await this.prisma.rubricCriterion.deleteMany({ where: { rubricId } });
    return this.prisma.rubric.update({
      where: { id: rubric.id },
      data: {
        courseId: dto.courseId,
        title: dto.title,
        description: dto.description,
        status: dto.status,
        totalPoints: criteria.length
          ? criteria.reduce((sum, item) => sum + item.maxPoints, 0)
          : undefined,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
        criteria: criteria.length
          ? {
              create: criteria.map((criterion, index) => ({
                title: criterion.title,
                description: criterion.description,
                maxPoints: criterion.maxPoints,
                orderIndex: criterion.orderIndex ?? index,
                metadata: (criterion.metadata ?? {}) as Prisma.InputJsonObject,
                levels: {
                  create: (criterion.levels ?? []).map((level, levelIndex) => ({
                    title: level.title,
                    description: level.description,
                    points: level.points,
                    orderIndex: level.orderIndex ?? levelIndex,
                  })),
                },
              })),
            }
          : undefined,
      },
      include: { criteria: { include: { levels: true } } },
    });
  }

  async deleteRubric(organization: OrganizationContext, userId: string, rubricId: string) {
    const rubric = await this.getRubric(organization, userId, rubricId);
    return this.prisma.rubric.update({
      where: { id: rubric.id },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  }

  async listSubmissions(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.getAssignment(organization.id, assignmentId);
    await this.ensureCanGradeCourse(organization, userId, assignment.courseId);
    return this.prisma.assignmentSubmission.findMany({
      where: { organizationId: organization.id, assignmentId },
      include: { user: true, rubricScores: true },
      orderBy: [{ submittedAt: "desc" }, { updatedAt: "desc" }],
    });
  }

  async getSubmission(organization: OrganizationContext, userId: string, submissionId: string) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, organizationId: organization.id },
      include: {
        user: true,
        assignment: { include: { rubric: { include: { criteria: { include: { levels: true } } } } } },
        rubricScores: true,
      },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    await this.ensureCanGradeCourse(organization, userId, submission.courseId);
    return submission;
  }

  async gradeSubmission(
    organization: OrganizationContext,
    userId: string,
    submissionId: string,
    dto: GradeSubmissionDto,
  ) {
    const submission = await this.getSubmission(organization, userId, submissionId);
    const rubricScores = dto.rubricScores ?? [];
    const score = rubricScores.length
      ? rubricScores.reduce((sum, item) => sum + item.points, 0)
      : (dto.score ?? 0);
    const maxScore =
      dto.maxScore ??
      submission.assignment.rubric?.totalPoints ??
      submission.maxScore ??
      score;
    await this.prisma.rubricScore.deleteMany({ where: { submissionId } });
    const graded = await this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        status: "GRADED",
        gradedAt: new Date(),
        gradedById: userId,
        score,
        maxScore,
        feedback: dto.feedback,
        rubricScores: rubricScores.length
          ? {
              create: rubricScores.map((item) => ({
                criterionId: item.criterionId,
                levelId: item.levelId,
                points: item.points,
                feedback: item.feedback,
              })),
            }
          : undefined,
      },
      include: { rubricScores: true, assignment: true },
    });
    await this.updateAssignmentProgress(organization.id, graded.userId, graded, true);
    await this.notifications?.createForUser({
      organizationId: organization.id,
      userId: graded.userId,
      type: "assignment_graded",
      title: `${graded.assignment.title} graded`,
      body: "Your assignment has been graded. Open it to review the result and feedback.",
      actionUrl: `/learn/assignments/${graded.assignmentId}`,
      entityType: "assignment_submission",
      entityId: graded.id,
      metadata: { courseId: graded.courseId, assignmentId: graded.assignmentId },
    });
    await this.audit(organization.id, userId, "assignment_submission.graded", submissionId);
    return graded;
  }

  async returnSubmission(
    organization: OrganizationContext,
    userId: string,
    submissionId: string,
    dto: ReturnSubmissionDto,
  ) {
    const submission = await this.getSubmission(organization, userId, submissionId);
    const returned = await this.prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: { status: "RETURNED", feedback: dto.feedback },
      include: { assignment: true },
    });
    await this.updateAssignmentProgress(organization.id, returned.userId, returned, false);
    await this.audit(organization.id, userId, "assignment_submission.returned", submissionId);
    return returned;
  }

  async getLearnerAssignment(organizationId: string, userId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, organizationId, status: "PUBLISHED", deletedAt: null },
      include: {
        rubric: { include: { criteria: { include: { levels: { orderBy: { orderIndex: "asc" } } }, orderBy: { orderIndex: "asc" } } } },
        submissions: {
          where: { userId },
          orderBy: { attemptNumber: "desc" },
          take: 1,
          include: { rubricScores: true },
        },
      },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    await this.ensureEnrollment(organizationId, userId, assignment.courseId);
    this.assertAvailable(assignment);
    return { assignment, latestSubmission: assignment.submissions[0] ?? null };
  }

  async createSubmission(
    organizationId: string,
    userId: string,
    assignmentId: string,
    dto: SaveSubmissionDto,
  ) {
    const assignment = await this.getPublishedAssignment(organizationId, userId, assignmentId);
    const latest = await this.prisma.assignmentSubmission.findFirst({
      where: { organizationId, assignmentId, userId },
      orderBy: { attemptNumber: "desc" },
    });
    if (latest?.status === "DRAFT") {
      return this.updateSubmission(organizationId, userId, latest.id, dto);
    }
    if (latest && !assignment.allowResubmission) {
      throw new ForbiddenException("Resubmission is not allowed");
    }
    const attemptNumber = (latest?.attemptNumber ?? 0) + 1;
    if (assignment.maxAttempts && attemptNumber > assignment.maxAttempts) {
      throw new ForbiddenException("Assignment attempt limit reached");
    }
    if (
      latest &&
      assignment.maxResubmissions != null &&
      (attemptNumber - 1) > assignment.maxResubmissions
    ) {
      throw new ForbiddenException(
        `Resubmission limit reached (max ${assignment.maxResubmissions})`,
      );
    }
    return this.prisma.assignmentSubmission.create({
      data: {
        organizationId,
        assignmentId,
        courseId: assignment.courseId,
        activityId: assignment.activityId,
        userId,
        attemptNumber,
        textAnswer: dto.textAnswer,
        linkUrl: dto.linkUrl,
        fileIds: (dto.fileIds ?? []) as Prisma.InputJsonArray,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
    });
  }

  async updateSubmission(
    organizationId: string,
    userId: string,
    submissionId: string,
    dto: SaveSubmissionDto,
  ) {
    const submission = await this.getOwnSubmission(organizationId, userId, submissionId);
    if (!["DRAFT", "RETURNED"].includes(submission.status)) {
      throw new ForbiddenException("Only draft or returned submissions can be edited");
    }
    return this.prisma.assignmentSubmission.update({
      where: { id: submissionId },
      data: {
        status: submission.status === "RETURNED" ? "RESUBMITTED" : "DRAFT",
        textAnswer: dto.textAnswer,
        linkUrl: dto.linkUrl,
        fileIds: (dto.fileIds ?? this.stringArray(submission.fileIds)) as Prisma.InputJsonArray,
        metadata: dto.metadata as Prisma.InputJsonObject | undefined,
      },
    });
  }

  async submitSubmission(organizationId: string, userId: string, submissionId: string) {
    const submission = await this.getOwnSubmission(organizationId, userId, submissionId);
    const assignment = await this.getPublishedAssignment(
      organizationId,
      userId,
      submission.assignmentId,
    );
    if (assignment.availableUntil && assignment.availableUntil.getTime() < Date.now()) {
      throw new ForbiddenException("Assignment is no longer available");
    }
    const isLate = Boolean(assignment.dueAt && assignment.dueAt.getTime() < Date.now());
    if (isLate && !assignment.allowLateSubmission) {
      throw new ForbiddenException("Late submission is not allowed");
    }
    const submitted = await this.prisma.assignmentSubmission.update({
      where: { id: submission.id },
      data: {
        status: isLate ? "LATE" : "SUBMITTED",
        submittedAt: new Date(),
      },
      include: { assignment: true },
    });
    await this.updateAssignmentProgress(organizationId, userId, submitted, false);
    await this.audit(organizationId, userId, "assignment_submission.submitted", submission.id);
    return submitted;
  }

  async submissionResult(organizationId: string, userId: string, submissionId: string) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, organizationId, userId },
      include: {
        assignment: { include: { rubric: { include: { criteria: { include: { levels: true } } } } } },
        rubricScores: true,
      },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    return submission;
  }

  private async assignmentDetail(organizationId: string, assignmentId: string) {
    return this.prisma.assignment.findFirstOrThrow({
      where: { id: assignmentId, organizationId },
      include: {
        activity: true,
        rubric: { include: { criteria: { include: { levels: true }, orderBy: { orderIndex: "asc" } } } },
        _count: { select: { submissions: true } },
      },
    });
  }

  private async getAssignment(organizationId: string, assignmentId: string) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, organizationId, deletedAt: null },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    return assignment;
  }

  private async getPublishedAssignment(
    organizationId: string,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, organizationId, status: "PUBLISHED", deletedAt: null },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    await this.ensureEnrollment(organizationId, userId, assignment.courseId);
    this.assertAvailable(assignment);
    return assignment;
  }

  private async getOwnSubmission(organizationId: string, userId: string, submissionId: string) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, organizationId, userId },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    return submission;
  }

  private async ensureCanUseRubric(
    organization: OrganizationContext,
    userId: string,
    rubricId: string,
    courseId: string,
  ) {
    const rubric = await this.prisma.rubric.findFirst({
      where: { id: rubricId, organizationId: organization.id, deletedAt: null },
    });
    if (!rubric) throw new NotFoundException("Rubric not found");
    if (rubric.courseId && rubric.courseId !== courseId) {
      throw new BadRequestException("Rubric belongs to another course");
    }
    if (rubric.courseId) await this.ensureCanManageCourse(organization, userId, rubric.courseId);
    return rubric;
  }

  private async ensureCanManageCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    const course = await this.prisma.course.findFirst({
      where: { id: courseId, organizationId: organization.id, deletedAt: null },
    });
    if (!course) throw new NotFoundException("Course not found");
    if (organization.isPlatformAdmin || organization.permissionKeys.includes("courses:update")) {
      return course;
    }
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: { organizationId: organization.id, courseId, userId },
    });
    if (!instructor) throw new ForbiddenException("Insufficient course permissions");
    return course;
  }

  private async ensureCanGradeCourse(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    if (
      organization.isPlatformAdmin ||
      organization.permissionKeys.includes("assignments:grade")
    ) {
      return this.ensureCanManageCourse(organization, userId, courseId);
    }
    return this.ensureCanManageCourse(organization, userId, courseId);
  }

  private async ensureCanManageActivity(
    organization: OrganizationContext,
    userId: string,
    activityId: string,
  ) {
    const activity = await this.prisma.activity.findFirst({
      where: { id: activityId, organizationId: organization.id },
    });
    if (!activity) throw new NotFoundException("Activity not found");
    await this.ensureCanManageCourse(organization, userId, activity.courseId);
    return activity;
  }

  private async ensureEnrollment(organizationId: string, userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
    });
    if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) {
      throw new ForbiddenException("Course enrollment is required");
    }
    return enrollment;
  }

  private assertAvailable(assignment: {
    availableFrom?: Date | null;
    availableUntil?: Date | null;
  }) {
    const now = Date.now();
    if (assignment.availableFrom && assignment.availableFrom.getTime() > now) {
      throw new ForbiddenException("Assignment is not available yet");
    }
    if (assignment.availableUntil && assignment.availableUntil.getTime() < now) {
      throw new ForbiddenException("Assignment is no longer available");
    }
  }

  private async attachAssignmentActivity(
    organizationId: string,
    activityId: string,
    assignmentId: string,
  ) {
    await this.prisma.activity.updateMany({
      where: { id: activityId, organizationId },
      data: {
        activityTypeKey: "core.assignment",
        pluginKey: "core.assignment",
        pluginVersion: "1.0.0",
        completionRule: { type: "assignment", assignmentId, completeWhen: "submitted" },
        gradingRule: { type: "assignment", assignmentId },
        assessmentDisplayPolicy: {
          allowPopout: false,
          allowDualWindow: false,
          allowAIAssistant: false,
          allowNotes: true,
          allowTranscript: false,
          requireFocusMode: false,
          detectTabSwitch: false,
        },
      },
    });
  }

  private async updateAssignmentProgress(
    organizationId: string,
    userId: string,
    submission: {
      courseId: string;
      activityId: string | null;
      score?: number | null;
      maxScore?: number | null;
      status: string;
      assignment: { completionRule?: Prisma.JsonValue; activityId?: string | null };
    },
    graded: boolean,
  ) {
    const activityId = submission.activityId ?? submission.assignment.activityId;
    if (!activityId) return;
    const activity = await this.prisma.activity.findFirstOrThrow({
      where: { id: activityId, organizationId },
    });
    const enrollment = await this.ensureEnrollment(organizationId, userId, submission.courseId);
    const rule = (activity.completionRule ?? {}) as Record<string, unknown>;
    const requiresGrade = rule.completeWhen === "graded" || rule.requiresPassingScore === true;
    const passingScore = Number(rule.passingScorePercent ?? 0);
    const percentage =
      submission.maxScore && submission.maxScore > 0
        ? ((submission.score ?? 0) / submission.maxScore) * 100
        : 0;
    const complete =
      submission.status !== "RETURNED" &&
      (!requiresGrade || (graded && percentage >= passingScore));
    await this.prisma.activityProgress.upsert({
      where: { organizationId_userId_activityId: { organizationId, userId, activityId } },
      update: {
        status: complete ? "COMPLETED" : "IN_PROGRESS",
        progressPercent: complete ? 100 : Math.max(Math.round(percentage), 25),
        completedAt: complete ? new Date() : null,
        lastAccessedAt: new Date(),
        enrollmentId: enrollment.id,
      },
      create: {
        organizationId,
        userId,
        courseId: submission.courseId,
        lessonId: activity.lessonId,
        activityId,
        enrollmentId: enrollment.id,
        status: complete ? "COMPLETED" : "IN_PROGRESS",
        progressPercent: complete ? 100 : 25,
        startedAt: new Date(),
        completedAt: complete ? new Date() : null,
        lastAccessedAt: new Date(),
      },
    });
    await this.recalculateEnrollment(organizationId, userId, submission.courseId);
  }

  private async recalculateEnrollment(organizationId: string, userId: string, courseId: string) {
    const requiredActivities = await this.prisma.activity.findMany({
      where: { organizationId, courseId, isRequired: true, isPublished: true },
      select: { id: true },
    });
    const completedRequired = await this.prisma.activityProgress.count({
      where: {
        organizationId,
        userId,
        activityId: { in: requiredActivities.map((activity) => activity.id) },
        status: "COMPLETED",
      },
    });
    const progressPercent = requiredActivities.length
      ? Math.round((completedRequired / requiredActivities.length) * 100)
      : 0;
    await this.prisma.enrollment.update({
      where: { organizationId_courseId_userId: { organizationId, courseId, userId } },
      data: {
        status: progressPercent === 100 && requiredActivities.length ? "COMPLETED" : "ACTIVE",
        progressPercent,
        completedAt: progressPercent === 100 && requiredActivities.length ? new Date() : null,
      },
    });
  }

  private date(value?: string) {
    return value ? new Date(value) : undefined;
  }

  private stringArray(value: unknown): string[] {
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
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
        entityType: "Assignment",
        entityId,
        metadata: {},
      },
    });
  }
}
