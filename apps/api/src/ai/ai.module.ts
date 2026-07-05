import { Module } from "@nestjs/common";
import { AI_CONFIG, createAiConfig } from "@lms/config";
import { RbacModule } from "../rbac/rbac.module";
import { StorageModule } from "../storage/storage.module";
import { AiCanonicalCacheService } from "./ai-canonical-cache.service";
import { AiChunkerService } from "./ai-chunker.service";
import {
  AiController,
  InstructorAiController,
  LearnerAiController,
} from "./ai.controller";
import { AiIndexingService } from "./ai-indexing.service";
import {
  AiChatProviderFactory,
  AiEmbeddingProviderFactory,
  LocalEmbeddingProviderFactory,
} from "./ai-provider.factories";
import { AiStatusService } from "./ai-status.service";
import { AiRetrieverService } from "./ai-retriever.service";
import { AiRoutingService } from "./ai-routing.service";
import { AiTextExtractorService } from "./ai-text-extractor.service";
import { AiTutorService } from "./ai-tutor.service";

@Module({
  imports: [RbacModule, StorageModule],
  controllers: [AiController, LearnerAiController, InstructorAiController],
  providers: [
    { provide: AI_CONFIG, useFactory: () => createAiConfig(process.env) },
    AiChatProviderFactory,
    AiEmbeddingProviderFactory,
    LocalEmbeddingProviderFactory,
    AiStatusService,
    AiTextExtractorService,
    AiChunkerService,
    AiIndexingService,
    AiRetrieverService,
    AiRoutingService,
    AiCanonicalCacheService,
    AiTutorService,
  ],
  exports: [
    AI_CONFIG,
    AiChatProviderFactory,
    AiEmbeddingProviderFactory,
    LocalEmbeddingProviderFactory,
    AiIndexingService,
  ],
})
export class AiModule {}
