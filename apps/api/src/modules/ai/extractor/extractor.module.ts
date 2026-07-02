import { Global, Module } from '@nestjs/common';
import { ExtractorService } from './extractor.service';

@Global()
@Module({
  providers: [ExtractorService],
  exports: [ExtractorService],
})
export class ExtractorModule {}
