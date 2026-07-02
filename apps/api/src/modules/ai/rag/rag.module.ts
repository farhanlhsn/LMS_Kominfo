import { Global, Module } from '@nestjs/common';
import { ChunkerService } from '../chunker/chunker.service';
import { RagService } from './rag.service';

@Global()
@Module({
  providers: [ChunkerService, RagService],
  exports: [ChunkerService, RagService],
})
export class RagModule {}
