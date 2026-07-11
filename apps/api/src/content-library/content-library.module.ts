import { Module } from "@nestjs/common";
import { ContentProcessingModule } from "../content-processing/content-processing.module";
import { FilesModule } from "../files/files.module";
import { RbacModule } from "../rbac/rbac.module";
import { RedisModule } from "../redis/redis.module";
import { ContentLibraryController } from "./content-library.controller";
import { ContentLibraryService } from "./content-library.service";

@Module({
  imports: [RbacModule, FilesModule, ContentProcessingModule, RedisModule],
  controllers: [ContentLibraryController],
  providers: [ContentLibraryService],
  exports: [ContentLibraryService],
})
export class ContentLibraryModule {}
