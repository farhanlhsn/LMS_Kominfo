import { Module } from "@nestjs/common";
import { MinioStorageProvider } from "./minio-storage.provider";
import { StorageService } from "./storage.service";

@Module({
  providers: [MinioStorageProvider, StorageService],
  exports: [StorageService],
})
export class StorageModule {}
