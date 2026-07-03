import { Module } from "@nestjs/common";
import { RbacModule } from "../rbac/rbac.module";
import { StorageModule } from "../storage/storage.module";
import { FileAccessPolicyService } from "./file-access-policy.service";
import { FilesController } from "./files.controller";
import { FilesService } from "./files.service";

@Module({
  imports: [RbacModule, StorageModule],
  controllers: [FilesController],
  providers: [FilesService, FileAccessPolicyService],
  exports: [FilesService, FileAccessPolicyService],
})
export class FilesModule {}
