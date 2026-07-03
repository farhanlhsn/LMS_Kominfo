import { Module } from "@nestjs/common";
import { ContentProcessingService } from "./content-processing.service";

@Module({
  providers: [ContentProcessingService],
  exports: [ContentProcessingService],
})
export class ContentProcessingModule {}

export class ContentProcessingQueue {}
export class VideoProcessingQueue {}
export class AiIndexingQueue {}
