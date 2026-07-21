import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { randomBytes, randomInt } from "node:crypto";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import {
  CreateAssignmentGroupDto,
  CreatePeerReviewConfigDto,
  CreatePortfolioDto,
  CreatePortfolioEntryDto,
  CreateProjectShowcaseDto,
  CreateSubmissionAnnotationDto,
  RunPlagiarismCheckDto,
  SubmitPeerReviewDto,
  UpdateAssignmentCollaborationDto,
  UpdateAssignmentGroupDto,
  UpdatePeerReviewConfigDto,
  UpdatePortfolioDto,
  UpdatePortfolioEntryDto,
  UpdateProjectShowcaseDto,
  UpdateSubmissionAnnotationDto,
} from "./dto/advanced-assignment.dto";
import {
  PLAGIARISM_PROVIDER,
  type PlagiarismCheckResult,
  type PlagiarismProvider,
} from "./plagiarism.provider";

const PUBLIC_PORTFOLIO_PREFIX = "pf";

@Injectable()
export class AdvancedAssignmentService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Optional()
    @Inject(PLAGIARISM_PROVIDER)
    private readonly plagiarismProvider?: PlagiarismProvider,
  ) {}

  // ============================================================
  // Group assignment
  // ============================================================

  async listGroups(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.getAssignmentForInstructor(
      organization,
      userId,
      assignmentId,
    );
    return this.prisma.assignmentGroup.findMany({
      where: { organizationId: organization.id, assignmentId: assignment.id },
      take: 100,
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, name: true } },
          },
          orderBy: { joinedAt: "asc" },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { name: "asc" },
    });
  }

  async createGroup(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
    dto: CreateAssignmentGroupDto,
  ) {
    const assignment = await this.getAssignmentForInstructor(
      organization,
      userId,
      assignmentId,
    );
    if (assignment.collaborationMode !== "GROUP") {
      throw new BadRequestException(
        "Assignment collaborationMode must be GROUP before creating groups",
      );
    }
    const memberIds = Array.from(new Set(dto.memberIds ?? []));
    if (memberIds.length) {
      const existingMembers = await this.prisma.enrollment.count({
        where: {
          organizationId: organization.id,
          courseId: assignment.courseId,
          userId: { in: memberIds },
          status: { in: ["ACTIVE", "COMPLETED"] },
        },
      });
      if (existingMembers !== memberIds.length) {
        throw new BadRequestException(
          "One or more members are not enrolled in the course",
        );
      }
    }
    const group = await this.prisma.assignmentGroup.create({
      data: {
        organizationId: organization.id,
        assignmentId: assignment.id,
        courseId: assignment.courseId,
        name: dto.name,
        maxMembers: dto.maxMembers ?? assignment.groupMaxMembers,
        members: memberIds.length
          ? {
              create: memberIds.map((memberId) => ({
                organizationId: organization.id,
                userId: memberId,
              })),
            }
          : undefined,
      },
      include: {
        members: { include: { user: { select: { id: true, email: true, name: true } } } },
      },
    });
    await this.audit(organization.id, userId, "assignment_group.created", group.id);
    return group;
  }

  async updateGroup(
    organization: OrganizationContext,
    userId: string,
    groupId: string,
    dto: UpdateAssignmentGroupDto,
  ) {
    const group = await this.getGroup(organization.id, groupId);
    await this.ensureCanManageAssignment(organization, userId, group.assignmentId);
    const updated = await this.prisma.assignmentGroup.update({
      where: { id: group.id },
      data: {
        name: dto.name,
        maxMembers: dto.maxMembers,
        status: dto.status,
      },
      include: { members: { include: { user: true } } },
    });
    await this.audit(organization.id, userId, "assignment_group.updated", group.id);
    return updated;
  }

  async deleteGroup(
    organization: OrganizationContext,
    userId: string,
    groupId: string,
  ) {
    const group = await this.getGroup(organization.id, groupId);
    await this.ensureCanManageAssignment(organization, userId, group.assignmentId);
    await this.prisma.assignmentGroup.delete({ where: { id: group.id } });
    await this.audit(organization.id, userId, "assignment_group.deleted", group.id);
    return { id: group.id };
  }

  async addGroupMember(
    organization: OrganizationContext,
    userId: string,
    groupId: string,
    memberId: string,
    role: "member" | "leader" = "member",
  ) {
    const group = await this.getGroup(organization.id, groupId);
    await this.ensureCanManageAssignment(organization, userId, group.assignmentId);
    const existing = await this.prisma.assignmentGroupMember.findFirst({
      where: { groupId: group.id, userId: memberId },
    });
    if (existing) {
      throw new ConflictException("User is already a member of the group");
    }
    const memberCount = await this.prisma.assignmentGroupMember.count({
      where: { groupId: group.id },
    });
    if (memberCount >= group.maxMembers) {
      throw new BadRequestException("Group is at capacity");
    }
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        organizationId_courseId_userId: {
          organizationId: organization.id,
          courseId: group.courseId,
          userId: memberId,
        },
      },
    });
    if (!enrollment || !["ACTIVE", "COMPLETED"].includes(enrollment.status)) {
      throw new BadRequestException("User is not enrolled in the course");
    }
    const created = await this.prisma.assignmentGroupMember.create({
      data: {
        organizationId: organization.id,
        groupId: group.id,
        userId: memberId,
        role,
      },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    await this.audit(
      organization.id,
      userId,
      "assignment_group.member_added",
      group.id,
    );
    return created;
  }

  async removeGroupMember(
    organization: OrganizationContext,
    userId: string,
    groupId: string,
    memberId: string,
  ) {
    const group = await this.getGroup(organization.id, groupId);
    await this.ensureCanManageAssignment(organization, userId, group.assignmentId);
    const member = await this.prisma.assignmentGroupMember.findFirst({
      where: { groupId: group.id, userId: memberId },
    });
    if (!member) throw new NotFoundException("Member not found");
    await this.prisma.assignmentGroupMember.delete({ where: { id: member.id } });
    await this.audit(
      organization.id,
      userId,
      "assignment_group.member_removed",
      group.id,
    );
    return { id: member.id };
  }

  // ============================================================
  // Peer review
  // ============================================================

  async getPeerReviewConfig(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    await this.getAssignmentForInstructor(organization, userId, assignmentId);
    return this.prisma.peerReviewConfig.findUnique({
      where: { assignmentId },
      include: { rubric: { include: { criteria: { include: { levels: true } } } } },
    });
  }

  async upsertPeerReviewConfig(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
    dto: CreatePeerReviewConfigDto | UpdatePeerReviewConfigDto,
  ) {
    const assignment = await this.getAssignmentForInstructor(
      organization,
      userId,
      assignmentId,
    );
    if (dto.rubricId) {
      const rubric = await this.prisma.rubric.findFirst({
        where: {
          id: dto.rubricId,
          organizationId: organization.id,
          deletedAt: null,
        },
      });
      if (!rubric) throw new NotFoundException("Rubric not found");
    }
    const config = await this.prisma.peerReviewConfig.upsert({
      where: { assignmentId: assignment.id },
      update: {
        reviewsRequired: dto.reviewsRequired ?? 2,
        reviewsToReceive: dto.reviewsToReceive ?? 2,
        openFrom: dto.openFrom ? new Date(dto.openFrom) : undefined,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        rubricId: dto.rubricId,
        anonymize: dto.anonymize ?? true,
        allowSelfReview: dto.allowSelfReview ?? false,
        status: (dto as UpdatePeerReviewConfigDto).status ?? undefined,
      },
      create: {
        organizationId: organization.id,
        assignmentId: assignment.id,
        reviewsRequired: dto.reviewsRequired ?? 2,
        reviewsToReceive: dto.reviewsToReceive ?? 2,
        openFrom: dto.openFrom ? new Date(dto.openFrom) : null,
        dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        rubricId: dto.rubricId ?? null,
        anonymize: dto.anonymize ?? true,
        allowSelfReview: dto.allowSelfReview ?? false,
        status: (dto as UpdatePeerReviewConfigDto).status ?? "DRAFT",
      },
    });
    await this.audit(
      organization.id,
      userId,
      "peer_review_config.upserted",
      config.id,
    );
    return config;
  }

  async generatePeerReviewMatches(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const config = await this.getPeerReviewConfig(
      organization,
      userId,
      assignmentId,
    );
    if (!config) {
      throw new BadRequestException("Peer review config not found");
    }
    const submissions = await this.prisma.assignmentSubmission.findMany({
      where: { organizationId: organization.id, assignmentId, status: { in: ["SUBMITTED", "LATE", "GRADED", "RESUBMITTED"] } },
      select: { id: true, userId: true },
    });
    if (submissions.length < 2) {
      throw new BadRequestException(
        "Need at least two submissions to generate peer review matches",
      );
    }
    const reviewsRequired = Math.max(1, config.reviewsRequired);
    const assignments = new Map<string, Set<string>>();
    const reverse = new Map<string, Set<string>>();
    const result: { matchId: string; submissionId: string; reviewerUserId: string }[] = [];
    const eligibleReviewers = await this.getEligibleReviewers(
      organization.id,
      config.allowSelfReview,
      submissions,
    );
    if (eligibleReviewers.length < 2) {
      throw new BadRequestException(
        "Not enough eligible reviewers to generate matches",
      );
    }
    const shuffled = this.shuffleInPlace([...submissions]);
    for (const submission of shuffled) {
      const candidates = eligibleReviewers.filter(
        (reviewerId) =>
          reviewerId !== submission.userId ||
          (config.allowSelfReview && reviewerId === submission.userId),
      );
      let reviewer = this.pickReviewer(
        submission.userId,
        candidates,
        assignments,
        reverse,
      );
      let attempts = 0;
      while (!reviewer && attempts < candidates.length) {
        const fallback = candidates.find(
          (id) =>
            (assignments.get(submission.userId)?.size ?? 0) <
              reviewsRequired &&
            (reverse.get(id)?.size ?? 0) < config.reviewsToReceive,
        );
        if (!fallback) break;
        reviewer = fallback;
        attempts += 1;
      }
      if (!reviewer) {
        throw new BadRequestException(
          "Unable to assign reviewers — adjust reviewsRequired or reviewsToReceive",
        );
      }
      const created = await this.prisma.peerReviewMatch.create({
        data: {
          organizationId: organization.id,
          configId: config.id,
          submissionId: submission.id,
          reviewerUserId: reviewer,
          dueAt: config.dueAt,
          status: "PENDING",
        },
      });
      result.push({
        matchId: created.id,
        submissionId: submission.id,
        reviewerUserId: reviewer,
      });
      const submissionAssignments =
        assignments.get(submission.userId) ?? new Set<string>();
      submissionAssignments.add(reviewer);
      assignments.set(submission.userId, submissionAssignments);
      const reviewerAssignments = reverse.get(reviewer) ?? new Set<string>();
      reviewerAssignments.add(submission.userId);
      reverse.set(reviewer, reviewerAssignments);
    }
    await this.audit(
      organization.id,
      userId,
      "peer_review.matches_generated",
      config.id,
    );
    return { configId: config.id, count: result.length, matches: result };
  }

  async listPeerReviewMatchesForInstructor(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    await this.getAssignmentForInstructor(organization, userId, assignmentId);
    return this.prisma.peerReviewMatch.findMany({
      where: { organizationId: organization.id, config: { assignmentId } },
      include: {
        submission: { select: { id: true, userId: true, attemptNumber: true } },
        reviewer: { select: { id: true, email: true, name: true } },
        review: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
  }

  async listPeerReviewsForLearner(
    organizationId: string,
    userId: string,
  ) {
    return this.prisma.peerReviewMatch.findMany({
      where: { organizationId, reviewerUserId: userId },
      take: 100,
      include: {
        submission: {
          select: {
            id: true,
            assignmentId: true,
            textAnswer: true,
            linkUrl: true,
            fileIds: true,
          },
        },
        config: { select: { id: true, anonymize: true, assignmentId: true } },
        review: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async submitPeerReview(
    organization: OrganizationContext,
    userId: string,
    matchId: string,
    dto: SubmitPeerReviewDto,
  ) {
    const match = await this.prisma.peerReviewMatch.findFirst({
      where: { id: matchId, organizationId: organization.id },
      include: { config: true, review: true },
    });
    if (!match) throw new NotFoundException("Peer review match not found");
    if (match.reviewerUserId !== userId) {
      throw new ForbiddenException("Only the assigned reviewer can submit this review");
    }
    if (match.review?.submittedAt) {
      throw new BadRequestException("Review already submitted");
    }
    const rubricScores = dto.rubricScores ?? [];
    return this.prisma.$transaction(async (tx) => {
      const review = await tx.peerReview.upsert({
        where: { matchId: match.id },
        update: {
          authorId: userId,
          overallScore: dto.overallScore,
          feedback: dto.feedback,
          submittedAt: new Date(),
        },
        create: {
          organizationId: organization.id,
          matchId: match.id,
          authorId: userId,
          overallScore: dto.overallScore,
          feedback: dto.feedback,
          submittedAt: new Date(),
        },
      });
      await tx.peerReviewRubricScore.deleteMany({ where: { reviewId: review.id } });
      if (rubricScores.length) {
        await tx.peerReviewRubricScore.createMany({
          data: rubricScores.map((score) => ({
            organizationId: organization.id,
            reviewId: review.id,
            rubricId: match.config.rubricId ?? "",
            criterionId: score.criterionId,
            levelId: score.levelId ?? null,
            points: score.points,
            feedback: score.feedback,
          })),
        });
      }
      await tx.peerReviewMatch.update({
        where: { id: match.id },
        data: { status: "SUBMITTED" },
      });
      return review;
    });
  }

  // ============================================================
  // Submission annotations (inline feedback placeholder)
  // ============================================================

  async listAnnotations(
    organizationId: string,
    submissionId: string,
  ) {
    await this.ensureSubmissionAccess(organizationId, submissionId);
    return this.prisma.submissionAnnotation.findMany({
      where: { organizationId, submissionId },
      include: {
        author: { select: { id: true, email: true, name: true } },
        resolvedBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: { startOffset: "asc" },
      take: 500,
    });
  }

  async createAnnotation(
    organization: OrganizationContext,
    userId: string,
    submissionId: string,
    dto: CreateSubmissionAnnotationDto,
  ) {
    const submission = await this.getSubmissionForGrader(
      organization,
      userId,
      submissionId,
    );
    const annotation = await this.prisma.submissionAnnotation.create({
      data: {
        organizationId: organization.id,
        submissionId: submission.id,
        authorId: userId,
        startOffset: dto.startOffset,
        endOffset: dto.endOffset,
        selectedText: dto.selectedText,
        comment: dto.comment,
      },
      include: { author: { select: { id: true, email: true, name: true } } },
    });
    await this.audit(organization.id, userId, "submission.annotation_created", annotation.id);
    return annotation;
  }

  async updateAnnotation(
    organization: OrganizationContext,
    userId: string,
    annotationId: string,
    dto: UpdateSubmissionAnnotationDto,
  ) {
    const annotation = await this.getAnnotation(organization.id, annotationId);
    await this.getSubmissionForGrader(organization, userId, annotation.submissionId);
    const isAuthor = annotation.authorId === userId;
    const isResolver = dto.resolved === true;
    if (dto.comment !== undefined && !isAuthor) {
      throw new ForbiddenException("Only the author can edit the comment");
    }
    if (dto.resolved === true && !isAuthor) {
      throw new ForbiddenException("Only the author can mark the annotation as resolved");
    }
    const updated = await this.prisma.submissionAnnotation.update({
      where: { id: annotation.id },
      data: {
        comment: dto.comment,
        resolved: dto.resolved ?? annotation.resolved,
        resolvedById: dto.resolved
          ? annotation.resolvedById ?? userId
          : annotation.resolvedById,
        resolvedAt: dto.resolved
          ? annotation.resolvedAt ?? new Date()
          : annotation.resolvedAt,
      },
      include: { author: true, resolvedBy: true },
    });
    await this.audit(organization.id, userId, "submission.annotation_updated", annotation.id);
    return updated;
  }

  async deleteAnnotation(
    organization: OrganizationContext,
    userId: string,
    annotationId: string,
  ) {
    const annotation = await this.getAnnotation(organization.id, annotationId);
    await this.getSubmissionForGrader(organization, userId, annotation.submissionId);
    await this.prisma.submissionAnnotation.delete({ where: { id: annotation.id } });
    await this.audit(organization.id, userId, "submission.annotation_deleted", annotation.id);
    return { id: annotation.id };
  }

  // ============================================================
  // Plagiarism check (provider abstraction)
  // ============================================================

  async listPlagiarismChecks(
    organization: OrganizationContext,
    userId: string,
    submissionId: string,
  ) {
    await this.getSubmissionForGrader(organization, userId, submissionId);
    return this.prisma.plagiarismCheck.findMany({
      where: { organizationId: organization.id, submissionId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async runPlagiarismCheck(
    organization: OrganizationContext,
    userId: string,
    submissionId: string,
    dto: RunPlagiarismCheckDto = {},
  ) {
    const submission = await this.getSubmissionForGrader(
      organization,
      userId,
      submissionId,
    );
    if (!this.plagiarismProvider) {
      throw new BadRequestException("Plagiarism provider is not configured");
    }
    const providerName = dto.provider ?? this.plagiarismProvider.name;
    const created = await this.prisma.plagiarismCheck.create({
      data: {
        organizationId: organization.id,
        submissionId: submission.id,
        requesterId: userId,
        provider: providerName,
        status: "RUNNING",
      },
    });
    const fileIds = Array.isArray(submission.fileIds)
      ? (submission.fileIds as unknown[]).filter(
          (id): id is string => typeof id === "string",
        )
      : [];
    let result: PlagiarismCheckResult;
    try {
      result = await this.plagiarismProvider.check({
        organizationId: organization.id,
        submissionId: submission.id,
        text: submission.textAnswer ?? "",
        fileIds,
        metadata: (submission.metadata ?? {}) as Record<string, unknown>,
      });
    } catch (error) {
      result = {
        provider: providerName,
        status: "FAILED",
        similarityScore: 0,
        matchedSources: [],
        errorMessage: error instanceof Error ? error.message : String(error),
      };
    }
    const updated = await this.prisma.plagiarismCheck.update({
      where: { id: created.id },
      data: {
        status: result.status,
        similarityScore: result.similarityScore,
        matchedSources: result.matchedSources as unknown as Prisma.InputJsonValue,
        reportUrl: result.reportUrl,
        details: (result.details ?? {}) as Prisma.InputJsonObject,
        errorMessage: result.errorMessage,
        completedAt: new Date(),
      },
    });
    await this.audit(organization.id, userId, "submission.plagiarism_checked", created.id);
    return updated;
  }

  // ============================================================
  // Project showcase
  // ============================================================

  async listShowcases(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
  ) {
    await this.ensureCanManageCourse(organization, userId, courseId);
    return this.prisma.projectShowcase.findMany({
      where: { organizationId: organization.id, courseId },
      include: {
        submission: { include: { assignment: { select: { id: true, title: true } } } },
        createdBy: { select: { id: true, email: true, name: true } },
      },
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: 100,
    });
  }

  async createShowcase(
    organization: OrganizationContext,
    userId: string,
    courseId: string,
    submissionId: string,
    dto: CreateProjectShowcaseDto,
  ) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, organizationId: organization.id, courseId },
    });
    if (!submission) {
      throw new NotFoundException("Submission not found for this course");
    }
    await this.ensureCanManageCourse(organization, userId, courseId);
    const existing = await this.prisma.projectShowcase.findUnique({
      where: { submissionId: submission.id },
    });
    if (existing) {
      throw new ConflictException("Showcase already exists for this submission");
    }
    const showcase = await this.prisma.projectShowcase.create({
      data: {
        organizationId: organization.id,
        courseId,
        submissionId: submission.id,
        createdById: userId,
        title: dto.title,
        summary: dto.summary,
        thumbnailUrl: dto.thumbnailUrl,
        externalUrl: dto.externalUrl,
        publishedAt: dto.publish ? new Date() : null,
      },
    });
    await this.audit(organization.id, userId, "project_showcase.created", showcase.id);
    return showcase;
  }

  async updateShowcase(
    organization: OrganizationContext,
    userId: string,
    showcaseId: string,
    dto: UpdateProjectShowcaseDto,
  ) {
    const showcase = await this.getShowcase(organization.id, showcaseId);
    await this.ensureCanManageCourse(organization, userId, showcase.courseId);
    const updated = await this.prisma.projectShowcase.update({
      where: { id: showcase.id },
      data: {
        title: dto.title,
        summary: dto.summary,
        thumbnailUrl: dto.thumbnailUrl,
        externalUrl: dto.externalUrl,
        featured: dto.featured,
        publishedAt: dto.published === undefined
          ? showcase.publishedAt
          : dto.published
            ? showcase.publishedAt ?? new Date()
            : null,
      },
    });
    await this.audit(organization.id, userId, "project_showcase.updated", showcase.id);
    return updated;
  }

  async deleteShowcase(
    organization: OrganizationContext,
    userId: string,
    showcaseId: string,
  ) {
    const showcase = await this.getShowcase(organization.id, showcaseId);
    await this.ensureCanManageCourse(organization, userId, showcase.courseId);
    await this.prisma.projectShowcase.delete({ where: { id: showcase.id } });
    await this.audit(organization.id, userId, "project_showcase.deleted", showcase.id);
    return { id: showcase.id };
  }

  async listPublicShowcases(
    organizationId: string,
    courseId: string,
  ) {
    return this.prisma.projectShowcase.findMany({
      where: { organizationId, courseId, publishedAt: { not: null } },
      orderBy: [{ featured: "desc" }, { publishedAt: "desc" }],
      take: 100,
    });
  }

  async recordShowcaseView(organizationId: string, showcaseId: string) {
    const showcase = await this.prisma.projectShowcase.findFirst({
      where: { id: showcaseId, organizationId, publishedAt: { not: null } },
    });
    if (!showcase) return null;
    return this.prisma.projectShowcase.update({
      where: { id: showcase.id },
      data: { viewCount: { increment: 1 } },
    });
  }

  // ============================================================
  // Portfolio
  // ============================================================

  async getMyPortfolio(organizationId: string, userId: string) {
    let portfolio = await this.prisma.portfolio.findFirst({
      where: { organizationId, userId },
      include: {
        entries: {
          orderBy: { orderIndex: "asc" },
          include: {
            submission: { select: { id: true, assignmentId: true } },
            showcase: true,
          },
        },
      },
    });
    if (!portfolio) {
      portfolio = await this.prisma.portfolio.create({
        data: {
          organizationId,
          userId,
          title: "My portfolio",
        },
        include: {
          entries: {
            orderBy: { orderIndex: "asc" },
            include: {
              submission: { select: { id: true, assignmentId: true } },
              showcase: true,
            },
          },
        },
      });
    }
    return portfolio;
  }

  async updateMyPortfolio(
    organizationId: string,
    userId: string,
    dto: UpdatePortfolioDto,
  ) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { organizationId, userId },
    });
    if (!portfolio) {
      throw new NotFoundException("Portfolio not found");
    }
    if (portfolio.userId !== userId) {
      throw new ForbiddenException("Not the portfolio owner");
    }
    return this.prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        title: dto.title,
        description: dto.description,
        isPublic: dto.isPublic,
        shareToken: dto.isPublic && !portfolio.shareToken
          ? this.generateShareToken()
          : portfolio.shareToken,
      },
    });
  }

  async addPortfolioEntry(
    organizationId: string,
    userId: string,
    dto: CreatePortfolioEntryDto,
  ) {
    const portfolio = await this.getMyPortfolio(organizationId, userId);
    const entry = await this.prisma.portfolioEntry.create({
      data: {
        organizationId,
        portfolioId: portfolio.id,
        submissionId: dto.submissionId,
        showcaseId: dto.showcaseId,
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex ?? Date.now(),
      },
    });
    return entry;
  }

  async updatePortfolioEntry(
    organizationId: string,
    userId: string,
    entryId: string,
    dto: UpdatePortfolioEntryDto,
  ) {
    const entry = await this.getPortfolioEntry(organizationId, entryId);
    await this.ensurePortfolioOwner(organizationId, userId, entry.portfolioId);
    return this.prisma.portfolioEntry.update({
      where: { id: entry.id },
      data: {
        title: dto.title,
        description: dto.description,
        orderIndex: dto.orderIndex,
      },
    });
  }

  async removePortfolioEntry(
    organizationId: string,
    userId: string,
    entryId: string,
  ) {
    const entry = await this.getPortfolioEntry(organizationId, entryId);
    await this.ensurePortfolioOwner(organizationId, userId, entry.portfolioId);
    await this.prisma.portfolioEntry.delete({ where: { id: entry.id } });
    return { id: entry.id };
  }

  async getPublicPortfolio(shareToken: string) {
    const portfolio = await this.prisma.portfolio.findUnique({
      where: { shareToken },
      include: {
        user: { select: { id: true, email: true, name: true } },
        entries: {
          orderBy: { orderIndex: "asc" },
          include: {
            submission: { select: { id: true, assignmentId: true } },
            showcase: true,
          },
        },
      },
    });
    if (!portfolio || !portfolio.isPublic) {
      throw new NotFoundException("Portfolio not found");
    }
    return portfolio;
  }

  // ============================================================
  // Assignment collaboration update (used by instructor builder)
  // ============================================================

  async updateAssignmentCollaboration(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
    dto: UpdateAssignmentCollaborationDto,
  ) {
    const assignment = await this.getAssignmentForInstructor(
      organization,
      userId,
      assignmentId,
    );
    const updated = await this.prisma.assignment.update({
      where: { id: assignment.id },
      data: {
        collaborationMode: dto.collaborationMode,
        groupMinMembers: dto.groupMinMembers,
        groupMaxMembers: dto.groupMaxMembers,
        maxResubmissions: dto.maxResubmissions,
      },
    });
    await this.audit(organization.id, userId, "assignment.collaboration_updated", updated.id);
    return updated;
  }

  // ============================================================
  // Helpers
  // ============================================================

  private async getAssignmentForInstructor(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, organizationId: organization.id, deletedAt: null },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    await this.ensureCanManageCourse(organization, userId, assignment.courseId);
    return assignment;
  }

  private async ensureCanManageAssignment(
    organization: OrganizationContext,
    userId: string,
    assignmentId: string,
  ) {
    const assignment = await this.prisma.assignment.findFirst({
      where: { id: assignmentId, organizationId: organization.id, deletedAt: null },
    });
    if (!assignment) throw new NotFoundException("Assignment not found");
    await this.ensureCanManageCourse(organization, userId, assignment.courseId);
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
    if (organization.isPlatformAdmin) return;
    if (organization.permissionKeys.includes("courses:update")) return;
    const instructor = await this.prisma.courseInstructor.findFirst({
      where: { organizationId: organization.id, courseId, userId },
    });
    if (!instructor) {
      throw new ForbiddenException("Insufficient course permissions");
    }
  }

  private async getGroup(organizationId: string, groupId: string) {
    const group = await this.prisma.assignmentGroup.findFirst({
      where: { id: groupId, organizationId: organizationId },
    });
    if (!group) throw new NotFoundException("Group not found");
    return group;
  }

  private async getShowcase(organizationId: string, showcaseId: string) {
    const showcase = await this.prisma.projectShowcase.findFirst({
      where: { id: showcaseId, organizationId },
    });
    if (!showcase) throw new NotFoundException("Showcase not found");
    return showcase;
  }

  private async getAnnotation(organizationId: string, annotationId: string) {
    const annotation = await this.prisma.submissionAnnotation.findFirst({
      where: { id: annotationId, organizationId },
    });
    if (!annotation) throw new NotFoundException("Annotation not found");
    return annotation;
  }

  private async getPortfolioEntry(organizationId: string, entryId: string) {
    const entry = await this.prisma.portfolioEntry.findFirst({
      where: { id: entryId, organizationId },
    });
    if (!entry) throw new NotFoundException("Portfolio entry not found");
    return entry;
  }

  private async ensurePortfolioOwner(
    organizationId: string,
    userId: string,
    portfolioId: string,
  ) {
    const portfolio = await this.prisma.portfolio.findFirst({
      where: { id: portfolioId, organizationId },
    });
    if (!portfolio) throw new NotFoundException("Portfolio not found");
    if (portfolio.userId !== userId) {
      throw new ForbiddenException("Not the portfolio owner");
    }
  }

  private async getSubmissionForGrader(
    organization: OrganizationContext,
    userId: string,
    submissionId: string,
  ) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, organizationId: organization.id },
    });
    if (!submission) throw new NotFoundException("Submission not found");
    await this.ensureCanManageCourse(organization, userId, submission.courseId);
    return submission;
  }

  private async ensureSubmissionAccess(
    organizationId: string,
    submissionId: string,
  ) {
    const submission = await this.prisma.assignmentSubmission.findFirst({
      where: { id: submissionId, organizationId },
    });
    if (!submission) throw new NotFoundException("Submission not found");
  }

  private async getEligibleReviewers(
    organizationId: string,
    allowSelfReview: boolean,
    submissions: { id: string; userId: string }[],
  ): Promise<string[]> {
    if (allowSelfReview) {
      return submissions.map((submission) => submission.userId);
    }
    const enrolled = await this.prisma.enrollment.findMany({
      where: {
        organizationId,
        status: { in: ["ACTIVE", "COMPLETED"] },
      },
      select: { userId: true },
    });
    return Array.from(new Set(enrolled.map((row) => row.userId)));
  }

  private pickReviewer(
    submissionOwnerId: string,
    candidates: string[],
    assignments: Map<string, Set<string>>,
    reverse: Map<string, Set<string>>,
  ): string | undefined {
    for (const reviewer of candidates) {
      const existing = assignments.get(submissionOwnerId);
      if (existing?.has(reviewer)) continue;
      const reverseExisting = reverse.get(reviewer);
      if (reverseExisting?.has(submissionOwnerId)) continue;
      return reviewer;
    }
    return undefined;
  }

  /** Fisher–Yates with crypto.randomInt (unbiased vs Math.random sort). */
  private shuffleInPlace<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = randomInt(0, i + 1);
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }

  private generateShareToken() {
    return `${PUBLIC_PORTFOLIO_PREFIX}_${randomBytes(12).toString("hex")}`;
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
        entityType: "AdvancedAssignment",
        entityId,
        metadata: metadata as Prisma.InputJsonObject,
      },
    });
  }
}
