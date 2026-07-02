import { Module } from '@nestjs/common';
import { QuizzesController, QuizManagementController, QuestionsController } from './quizzes.controller';
import { QuizzesService } from './quizzes.service';

@Module({
  controllers: [QuizzesController, QuizManagementController, QuestionsController],
  providers: [QuizzesService],
  exports: [QuizzesService],
})
export class QuizzesModule {}
