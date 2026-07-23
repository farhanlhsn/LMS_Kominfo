import { Module } from "@nestjs/common";
import { AI_CONFIG, createAiConfig } from "@lms/config";
import { RbacModule } from "../rbac/rbac.module";
import { StorageModule } from "../storage/storage.module";
import { PluginsModule } from "../plugins/plugins.module";
import { AiCanonicalCacheService } from "./ai-canonical-cache.service";
import { AiChunkerService } from "./ai-chunker.service";
import {
  AiController,
  AdminAiProviderController,
  InstructorActivityAiController,
  InstructorAiController,
  InstructorAiGradingController,
  LearnerAiController,
  InstructorAiItemsController,
} from "./ai.controller";
import { AiGeneratedItemService } from "./ai-generated-item.service";
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
import { AiTenantRuntimeService } from "./ai-tenant-runtime.service";
import { AiGradingAssistantService } from "./ai-grading-assistant.service";

@Module({
  imports: [RbacModule, StorageModule, PluginsModule],
  controllers: [
    AiController,
    AdminAiProviderController,
    LearnerAiController,
    InstructorAiController,
    InstructorAiGradingController,
    InstructorActivityAiController,
    InstructorAiItemsController,
  ],
  providers: [
    { provide: AI_CONFIG, useFactory: () => createAiConfig(process.env) },
    AiChatProviderFactory,
    AiEmbeddingProviderFactory,
    LocalEmbeddingProviderFactory,
    AiStatusService,
    AiGeneratedItemService,
    AiTextExtractorService,
    AiChunkerService,
    AiIndexingService,
    AiRetrieverService,
    AiRoutingService,
    AiCanonicalCacheService,
    AiTutorService,
    AiTenantRuntimeService,
    AiGradingAssistantService,
  ],
  exports: [
    AI_CONFIG,
    AiChatProviderFactory,
    AiEmbeddingProviderFactory,
    LocalEmbeddingProviderFactory,
    AiIndexingService,
    AiTenantRuntimeService,
  ],
})
export class AiModule {}
