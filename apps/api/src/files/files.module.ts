import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { StorageModule } from "../storage/storage.module";
import { RedisModule } from "../redis/redis.module";
import { FileAccessPolicyService } from "./file-access-policy.service";
import { FileContentController, FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [RbacModule, StorageModule, RedisModule],
  controllers: [FileContentController, FilesController],
  providers: [FilesService, FileAccessPolicyService],
  exports: [FilesService, FileAccessPolicyService],
})
export class FilesModule {}
