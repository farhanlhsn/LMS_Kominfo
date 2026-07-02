import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiController } from './ai.controller';
import { PrismaModule } from '@/prisma/prisma.module';
import { AiGatewayModule } from './gateway/ai.gateway.module';
import { RagModule } from './rag/rag.module';
import { AiQueueModule } from './queue/ai-queue.module';
import { ExtractorModule } from './extractor/extractor.module';

@Module({
  imports: [
    PrismaModule,
    AiGatewayModule,  // global — exports AiGateway
    RagModule,        // global — exports ChunkerService, RagService
    AiQueueModule,    // global — exports AiQueueService
    ExtractorModule,  // global — exports ExtractorService
  ],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
