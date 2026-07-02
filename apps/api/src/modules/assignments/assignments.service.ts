import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AssignmentsService {
  private readonly logger = new Logger(AssignmentsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findByLesson(lessonId: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { lessonId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async findById(id: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id },
      include: {
        submissions: {
          orderBy: { submittedAt: 'desc' },
          include: { student: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!assignment) throw new NotFoundException('Assignment not found');
    return assignment;
  }

  async create(lessonId: string, dto: {
    title: string; instruction: string; dueDate?: string;
    maxScore?: number; allowedExtensions?: string[];
  }) {
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.prisma.lesson.update({ where: { id: lessonId }, data: { type: 'ASSIGNMENT' } });

    const existing = await this.prisma.assignment.findUnique({ where: { lessonId } });
    if (existing) throw new ForbiddenException('Assignment already exists for this lesson');

    return this.prisma.assignment.create({
      data: {
        lessonId, title: dto.title, instruction: dto.instruction,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        maxScore: dto.maxScore || 100,
        allowedExtensions: dto.allowedExtensions || ['pdf', 'docx', 'zip'],
      },
    });
  }

  async submit(assignmentId: string, studentId: string, materialId: string) {
    const assignment = await this.prisma.assignment.findUnique({ where: { id: assignmentId } });
    if (!assignment) throw new NotFoundException('Assignment not found');

    if (assignment.dueDate && new Date() > assignment.dueDate) {
      throw new ForbiddenException('Assignment past due date');
    }

    const submission = await this.prisma.submission.upsert({
      where: {
        assignmentId_studentId: { assignmentId, studentId },
      },
      create: { assignmentId, studentId, materialId },
      update: { materialId, submittedAt: new Date(), score: null, feedback: null, gradedAt: null },
    });

    this.logger.log(`Submission: student ${studentId} for assignment ${assignmentId}`);
    return submission;
  }

  async grade(submissionId: string, dto: { score: number; feedback?: string }, instructorId: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: { assignment: true },
    });
    if (!submission) throw new NotFoundException('Submission not found');

    return this.prisma.submission.update({
      where: { id: submissionId },
      data: { score: dto.score, feedback: dto.feedback, gradedAt: new Date() },
    });
  }

  async getMySubmission(assignmentId: string, userId: string) {
    return this.prisma.submission.findFirst({
      where: { assignmentId, studentId: userId },
      include: { material: true },
    });
  }

  async getSubmissions(assignmentId: string) {
    return this.prisma.submission.findMany({
      where: { assignmentId },
      orderBy: { submittedAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, email: true } },
        material: { select: { id: true, originalFilename: true, publicUrl: true, mimeType: true } },
      },
    });
  }
}
