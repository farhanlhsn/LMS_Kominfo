import { Module } from "@nestjs/common";
import { ContentProcessingModule } from "../content-processing/content-processing.module";
import { FilesModule } from "../files/files.module";
import { PluginsModule } from "../plugins/plugins.module";
import { RbacModule } from "../rbac/rbac.module";
import { ActivityContentController } from "./activity-content.controller";
import { ActivityContentService } from "./activity-content.service";

@Module({
  imports: [RbacModule, FilesModule, ContentProcessingModule, PluginsModule],
  controllers: [ActivityContentController],
  providers: [ActivityContentService],
  exports: [ActivityContentService],
})
export class ActivityContentModule {}
