import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class QuizzesService {
  private readonly logger = new Logger(QuizzesService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Quiz CRUD
  async findByLesson(lessonId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { lessonId },
      include: { _count: { select: { questions: true } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');
    return quiz;
  }

  async findById(id: string, currentUserRole?: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { choices: { orderBy: { label: 'asc' } } },
        },
      },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Jangan bocorkan `isCorrect` ke student/instructor yang sedang attempt kuis.
    // Hanya SUPER_ADMIN/REGIONAL_ADMIN yang boleh melihat kunci jawaban.
    const hideCorrect = currentUserRole === 'STUDENT' || currentUserRole === 'INSTRUCTOR';
    if (hideCorrect) {
      return {
        ...quiz,
        questions: quiz.questions.map((q) => ({
          ...q,
          choices: q.choices.map(({ isCorrect: _ignored, ...rest }) => rest),
        })),
      };
    }
    return quiz;
  }

  async create(lessonId: string, dto: {
    title: string; description?: string; passingScore?: number;
    durationMinutes?: number; maxAttempt?: number;
    shuffleQuestion?: boolean; shuffleChoice?: boolean;
  }) {
    // Check lesson exists and is QUIZ type
    const lesson = await this.prisma.lesson.findUnique({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found');

    await this.prisma.lesson.update({
      where: { id: lessonId },
      data: { type: 'QUIZ' },
    });

    const existing = await this.prisma.quiz.findUnique({ where: { lessonId } });
    if (existing) throw new ForbiddenException('Quiz already exists for this lesson');

    const quiz = await this.prisma.quiz.create({
      data: {
        lessonId, title: dto.title, description: dto.description,
        passingScore: dto.passingScore || 70,
        durationMinutes: dto.durationMinutes || 0,
        maxAttempt: dto.maxAttempt || 3,
        shuffleQuestion: dto.shuffleQuestion || false,
        shuffleChoice: dto.shuffleChoice || false,
      },
    });
    return quiz;
  }

  async update(id: string, dto: Record<string, unknown>) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) { if (v !== undefined) data[k] = v; }

    return this.prisma.quiz.update({ where: { id }, data: data as any });
  }

  async remove(id: string) {
    const quiz = await this.prisma.quiz.findUnique({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found');
    await this.prisma.quiz.delete({ where: { id } });
    return { success: true, message: 'Quiz deleted' };
  }

  // Questions
  async addQuestion(quizId: string, dto: {
    type: string; question: string; explanation?: string;
    score?: number; order?: number;
    choices?: { label: string; value: string; isCorrect: boolean }[];
  }) {
    await this.prisma.quiz.findUnique({ where: { id: quizId } });
    if (!await this.prisma.quiz.count({ where: { id: quizId } })) throw new NotFoundException('Quiz not found');

    const maxOrder = await this.prisma.question.aggregate({
      where: { quizId }, _max: { order: true },
    });

    const question = await this.prisma.question.create({
      data: {
        quizId, type: dto.type as any, question: dto.question,
        explanation: dto.explanation, score: dto.score || 1,
        order: dto.order ?? ((maxOrder._max.order ?? -1) + 1),
      },
    });

    if (dto.choices && dto.choices.length > 0) {
      await this.prisma.choice.createMany({
        data: dto.choices.map(c => ({
          questionId: question.id, label: c.label, value: c.value, isCorrect: c.isCorrect,
        })),
      });
    }

    return this.prisma.question.findUnique({
      where: { id: question.id },
      include: { choices: true },
    });
  }

  async updateQuestion(id: string, dto: Record<string, unknown>) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');

    if (dto.choices) {
      await this.prisma.choice.deleteMany({ where: { questionId: id } });
      const choices = dto.choices as { label: string; value: string; isCorrect: boolean }[];
      await this.prisma.choice.createMany({
        data: choices.map(c => ({ questionId: id, label: c.label, value: c.value, isCorrect: c.isCorrect })),
      });
      delete dto.choices;
    }

    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(dto)) { if (v !== undefined) data[k] = v; }

    await this.prisma.question.update({ where: { id }, data: data as any });
    return this.prisma.question.findUnique({ where: { id }, include: { choices: true } });
  }

  async removeQuestion(id: string) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    await this.prisma.question.delete({ where: { id } });
    return { success: true, message: 'Question deleted' };
  }

  // Attempts
  async startAttempt(quizId: string, userId: string) {
    const quiz = await this.prisma.quiz.findUnique({
      where: { id: quizId },
      include: { questions: { include: { choices: true } } },
    });
    if (!quiz) throw new NotFoundException('Quiz not found');

    // Check attempt limit
    if (quiz.maxAttempt > 0) {
      const attempts = await this.prisma.quizAttempt.count({
        where: { quizId, userId },
      });
      if (attempts >= quiz.maxAttempt) {
        throw new ForbiddenException('Maximum attempts reached');
      }
    }

    const attempt = await this.prisma.quizAttempt.create({
      data: { quizId, userId, score: 0 },
    });

    // Sembunyikan `isCorrect` saat student mulai attempt agar tidak bisa diintip.
    const sanitizedQuestions = quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      question: q.question,
      explanation: null, // explanation hanya tersedia setelah submit
      score: q.score,
      order: q.order,
      choices: q.choices.map(({ isCorrect: _ignored, ...rest }) => rest),
    }));

    const orderedQuestions = quiz.shuffleQuestion
      ? sanitizedQuestions.sort(() => Math.random() - 0.5)
      : sanitizedQuestions;

    return {
      attemptId: attempt.id,
      title: quiz.title,
      durationMinutes: quiz.durationMinutes,
      totalQuestions: quiz.questions.length,
      questions: orderedQuestions,
    };
  }

  async submitAttempt(attemptId: string, userId: string, dto: { answers: { questionId: string; answer: unknown }[] }) {
    const attempt = await this.prisma.quizAttempt.findUnique({ where: { id: attemptId } });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException('Not your attempt');
    if (attempt.submittedAt) throw new ForbiddenException('Already submitted');

    let totalScore = 0;
    let maxScore = 0;

    for (const ans of dto.answers) {
      const question = await this.prisma.question.findUnique({
        where: { id: ans.questionId },
        include: { choices: true },
      });
      if (!question) continue;

      let earned = 0;

      switch (question.type) {
        case 'TRUE_FALSE':
        case 'MULTIPLE_CHOICE': {
          const correct = question.choices.find(c => c.isCorrect);
          if (correct && ans.answer === correct.label) earned = question.score;
          break;
        }
        case 'MULTIPLE_SELECT': {
          const correctLabels = question.choices.filter(c => c.isCorrect).map(c => c.label).sort();
          const userAnswers = (Array.isArray(ans.answer) ? ans.answer : [ans.answer]) as string[];
          if (JSON.stringify(userAnswers.sort()) === JSON.stringify(correctLabels)) earned = question.score;
          break;
        }
        case 'ESSAY': {
          earned = 0; // Manual grading for essays
          break;
        }
        default:
          earned = 0;
      }

      totalScore += earned;
      maxScore += question.score;

      await this.prisma.quizAnswer.create({
        data: { attemptId, questionId: ans.questionId, answer: ans.answer, score: earned },
      });
    }

    const passingScore = (await this.prisma.quiz.findUnique({ where: { id: attempt.quizId } }))!.passingScore;
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const passed = percentage >= passingScore;

    await this.prisma.quizAttempt.update({
      where: { id: attemptId },
      data: { score: percentage, passed, submittedAt: new Date() },
    });

    // Update leaderboard
    if (passed) {
      await this.prisma.leaderboard.upsert({
        where: { userId_regionId_courseId: { userId, regionId: '__global__', courseId: '__global__' } },
        create: { userId, regionId: '__global__', courseId: '__global__', totalXP: maxScore, totalScore: percentage },
        update: { totalXP: { increment: maxScore }, totalScore: percentage },
      });
    }

    return { score: percentage, passed, totalScore, maxScore };
  }

  async getResult(attemptId: string, userId: string) {
    const attempt = await this.prisma.quizAttempt.findUnique({
      where: { id: attemptId },
      include: {
        quiz: { select: { title: true, passingScore: true } },
        answers: {
          include: {
            question: {
              include: { choices: true },
            },
          },
        },
      },
    });
    if (!attempt) throw new NotFoundException('Attempt not found');
    if (attempt.userId !== userId) throw new ForbiddenException('Not your attempt');

    return attempt;
  }

  async getResults(quizId: string) {
    return this.prisma.quizAttempt.findMany({
      where: { quizId },
      orderBy: { score: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}
