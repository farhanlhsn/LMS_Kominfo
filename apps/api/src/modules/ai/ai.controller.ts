import { Controller, Post, Get, Param, Body, UseGuards, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AiService } from './ai.service';
import { JwtAuthGuard } from '../auth/auth.controller';
import { Roles } from '../auth/roles.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AskAiDto, SummaryDto, QuizGeneratorDto, EssayReviewDto, RecommendationDto, TriggerIngestionDto } from './dto/ai.dto';

const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);

interface ReqUser { userId: string; role: string; regionId: string; }

@ApiTags('AI')
@ApiBearerAuth('JWT-auth')
@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @Roles('STUDENT', 'INSTRUCTOR')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ai: { ttl: 60000, limit: 15 } })
  @ApiOperation({ summary: 'Kirim pesan ke AI Tutor dengan RAG retrieval + sitasi' })
  askAi(@Body() dto: AskAiDto, @CurrentUser() user: ReqUser) {
    return this.aiService.askAi(user.userId, dto);
  }

  /**
   * Streaming chat (Server-Sent Events).
   *
   * POST /ai/chat/stream
   * - Accept: application/json
   * - Response: text/event-stream dengan event `session`, `sources`, `token`, `done`.
   * - Frontend konsumsi dengan `fetch` + `ReadableStream` atau EventSource wrapper.
   */
  @Post('chat/stream')
  @Roles('STUDENT', 'INSTRUCTOR')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ai: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Streaming AI Tutor via Server-Sent Events' })
  async chatStream(
    @Body() dto: AskAiDto,
    @CurrentUser() user: ReqUser,
    @Res() res: Response,
  ): Promise<void> {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // disable nginx buffering
    res.flushHeaders?.();

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inner: AsyncGenerator<{ event: string; data: any }> = this.aiService.askAiStream(user.userId, dto) as any;
      for await (const ev of inner) {
        const payload = typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data);
        res.write(`event: ${ev.event}\ndata: ${payload}\n\n`);
      }
    } catch (err) {
      res.write(`event: error\ndata: ${JSON.stringify({ message: (err as Error).message })}\n\n`);
    } finally {
      res.end();
    }
  }

  @Get('session/:sessionId')
  @Roles('STUDENT', 'INSTRUCTOR')
  @ApiOperation({ summary: 'Mengambil history chat session berdasarkan ID' })
  getChatHistory(@Param('sessionId') sessionId: string, @CurrentUser() user: ReqUser) {
    return this.aiService.getChatHistory(sessionId, user.userId);
  }

  @Post('summary')
  @Roles('STUDENT', 'INSTRUCTOR')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ai: { ttl: 60000, limit: 15 } })
  @ApiOperation({ summary: 'Meringkas materi lesson atau teks bebas via AI' })
  summarize(@Body() dto: SummaryDto, @CurrentUser() user: ReqUser) {
    return this.aiService.summarize(user.userId, dto);
  }

  @Post('quiz-generator')
  @Roles('INSTRUCTOR', 'SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ai: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Generate soal kuis pilihan ganda dari materi lesson (instruktur)' })
  generateQuiz(@Body() dto: QuizGeneratorDto, @CurrentUser() user: ReqUser) {
    return this.aiService.generateQuiz(user.userId, dto);
  }

  @Post('essay-review')
  @Roles('STUDENT', 'INSTRUCTOR')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ai: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Review esai siswa via AI (skor 0-100 + feedback)' })
  reviewEssay(@Body() dto: EssayReviewDto, @CurrentUser() user: ReqUser) {
    return this.aiService.reviewEssay(user.userId, dto);
  }

  @Post('recommendation')
  @Roles('STUDENT', 'INSTRUCTOR')
  @HttpCode(HttpStatus.OK)
  @Throttle({ ai: { ttl: 60000, limit: 10 } })
  @ApiOperation({ summary: 'Rekomendasi materi/lesson personal berdasarkan progress siswa' })
  recommend(@Body() dto: RecommendationDto, @CurrentUser() user: ReqUser) {
    return this.aiService.recommend(user.userId, dto);
  }

  @Post('ingest/lesson')
  @Roles('INSTRUCTOR', 'SUPER_ADMIN', 'REGIONAL_ADMIN')
  @HttpCode(HttpStatus.ACCEPTED)
  @Throttle({ ai: { ttl: 60000, limit: 30 } })
  @ApiOperation({ summary: 'Trigger background job untuk extract+embed materi lesson ke pgvector' })
  triggerIngest(@Body() dto: TriggerIngestionDto) {
    return this.aiService.triggerLessonIngestion(dto.lessonId);
  }
}
