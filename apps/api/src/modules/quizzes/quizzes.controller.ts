import {
  Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { QuizzesService } from './quizzes.service';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles, RolesGuard } from '../auth/roles.guard';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

@ApiTags('Quizzes')
@ApiBearerAuth('JWT-auth')
@Controller('quizzes')
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Detail kuis (isCorrect disembunyikan untuk STUDENT/INSTRUCTOR)' })
  findOne(@Param('id') id: string, @CurrentUser() user: { userId: string; role: string }) {
    return this.quizzesService.findById(id, user.role);
  }

  @Post(':id/start')
  @ApiOperation({ summary: 'Mulai attempt kuis dan menghasilkan attemptId' })
  start(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.quizzesService.startAttempt(id, user.userId);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submit jawaban kuis untuk dinilai otomatis' })
  submit(@Param('id') id: string, @Body() dto: SubmitQuizDto, @CurrentUser() user: { userId: string }) {
    return this.quizzesService.submitAttempt(id, user.userId, dto);
  }

  @Get(':id/result')
  @ApiOperation({ summary: 'Mendapatkan hasil attempt student saat ini' })
  getResult(@Param('id') id: string, @CurrentUser() user: { userId: string }) {
    return this.quizzesService.getResult(id, user.userId);
  }

  @Get(':id/leaderboard')
  @ApiOperation({ summary: 'Leaderboard kuis (top attempts)' })
  leaderboard(@Param('id') id: string) {
    return this.quizzesService.getResults(id);
  }
}

// Quiz management (admin/instructor) - nested under lessons
@ApiTags('Quizzes')
@ApiBearerAuth('JWT-auth')
@Controller('lessons/:lessonId/quiz')
@UseGuards(JwtAuthGuard)
export class QuizManagementController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan kuis pada lesson' })
  findByLesson(@Param('lessonId') lessonId: string) {
    return this.quizzesService.findByLesson(lessonId);
  }

  @Post()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Membuat kuis baru pada lesson' })
  create(@Param('lessonId') lessonId: string, @Body() dto: CreateQuizDto) {
    return this.quizzesService.create(lessonId, dto);
  }

  @Patch(':quizId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Memperbarui kuis' })
  update(@Param('quizId') quizId: string, @Body() dto: Record<string, unknown>) {
    return this.quizzesService.update(quizId, dto);
  }

  @Delete(':quizId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Menghapus kuis' })
  remove(@Param('quizId') quizId: string) {
    return this.quizzesService.remove(quizId);
  }
}

// Questions nested under quiz
@ApiTags('Quizzes')
@ApiBearerAuth('JWT-auth')
@Controller('quizzes/:quizId/questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post()
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Menambahkan soal baru pada kuis' })
  create(@Param('quizId') quizId: string, @Body() dto: CreateQuestionDto) {
    return this.quizzesService.addQuestion(quizId, dto);
  }

  @Patch(':questionId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Memperbarui soal' })
  update(@Param('questionId') questionId: string, @Body() dto: Record<string, unknown>) {
    return this.quizzesService.updateQuestion(questionId, dto);
  }

  @Delete(':questionId')
  @Roles('SUPER_ADMIN', 'REGIONAL_ADMIN', 'INSTRUCTOR')
  @UseGuards(RolesGuard)
  @ApiOperation({ summary: 'Menghapus soal' })
  remove(@Param('questionId') questionId: string) {
    return this.quizzesService.removeQuestion(questionId);
  }
}
