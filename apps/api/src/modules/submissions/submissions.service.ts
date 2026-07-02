import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { CreateSubmissionDto, GradeSubmissionDto } from './dto/submissions.dto';

@Injectable()
export class SubmissionsService {
  private readonly logger = new Logger(SubmissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async submitAssignment(dto: CreateSubmissionDto, studentId: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: dto.assignmentId },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    const material = await this.prisma.material.findUnique({
      where: { id: dto.materialId },
    });

    if (!material || material.uploadedBy !== studentId) {
      throw new ForbiddenException('Invalid material or not uploaded by you');
    }

    const existingSubmission = await this.prisma.submission.findFirst({
      where: { assignmentId: dto.assignmentId, studentId },
    });

    if (existingSubmission) {
      // Update submission with new material
      const submission = await this.prisma.submission.update({
        where: { id: existingSubmission.id },
        data: { materialId: dto.materialId, submittedAt: new Date(), score: null, feedback: null },
      });
      this.logger.log(`Student ${studentId} updated submission for assignment ${dto.assignmentId}`);
      return submission;
    }

    const submission = await this.prisma.submission.create({
      data: {
        assignmentId: dto.assignmentId,
        studentId,
        materialId: dto.materialId,
      },
    });

    this.logger.log(`Student ${studentId} submitted assignment ${dto.assignmentId}`);
    return submission;
  }

  async gradeSubmission(submissionId: string, dto: GradeSubmissionDto, instructorId: string, role: string) {
    const submission = await this.prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        assignment: {
          include: {
            lesson: {
              include: {
                module: {
                  include: { course: true },
                },
              },
            },
          },
        },
      },
    });

    if (!submission) throw new NotFoundException('Submission not found');

    const course = submission.assignment.lesson.module.course;

    if (role === 'INSTRUCTOR' && course.instructorId !== instructorId) {
      throw new ForbiddenException('Only the course instructor can grade this submission');
    }

    const gradedSubmission = await this.prisma.submission.update({
      where: { id: submissionId },
      data: {
        score: dto.score,
        feedback: dto.feedback,
        gradedAt: new Date(),
      },
    });

    this.logger.log(`Instructor graded submission ${submissionId} with score ${dto.score}`);
    return gradedSubmission;
  }

  async getMySubmissions(studentId: string) {
    return this.prisma.submission.findMany({
      where: { studentId },
      include: {
        assignment: { select: { title: true, maxScore: true } },
        material: { select: { filename: true, publicUrl: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }

  async getAssignmentSubmissions(assignmentId: string, instructorId: string, role: string) {
    const assignment = await this.prisma.assignment.findUnique({
      where: { id: assignmentId },
      include: {
        lesson: { include: { module: { include: { course: true } } } },
      },
    });

    if (!assignment) throw new NotFoundException('Assignment not found');

    if (role === 'INSTRUCTOR' && assignment.lesson.module.course.instructorId !== instructorId) {
      throw new ForbiddenException('Only the course instructor can view these submissions');
    }

    return this.prisma.submission.findMany({
      where: { assignmentId },
      include: {
        student: { select: { id: true, name: true, email: true } },
        material: { select: { filename: true, publicUrl: true } },
      },
      orderBy: { submittedAt: 'desc' },
    });
  }
}
