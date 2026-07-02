import { Global, Module } from '@nestjs/common';
import { AiQueueService } from './ai-queue.service';

@Global()
@Module({
  providers: [AiQueueService],
  exports: [AiQueueService],
})
export class AiQueueModule {}
