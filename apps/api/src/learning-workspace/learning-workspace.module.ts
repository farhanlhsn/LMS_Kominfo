import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { AiModule } from "../ai/ai.module";
import { PluginsModule } from "../plugins/plugins.module";
import {
  InstructorTranscriptController,
  LearningWorkspaceController,
} from "./learning-workspace.controller";
import { LearningWorkspaceService } from "./learning-workspace.service";

@Module({
  imports: [RbacModule, AiModule, PluginsModule],
  controllers: [LearningWorkspaceController, InstructorTranscriptController],
  providers: [LearningWorkspaceService],
  exports: [LearningWorkspaceService],
})
export class LearningWorkspaceModule {}
