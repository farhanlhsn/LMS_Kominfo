import { Inject, Injectable } from "@nestjs/common";
import { MinioStorageProvider } from "./minio-storage.provider";
import type {
  StorageObjectMetadata,
  StorageProvider,
  StorageUploadInput,
} from "./storage-provider.interface";

@Injectable()
export class StorageService implements StorageProvider {
  constructor(
    @Inject(MinioStorageProvider)
    private readonly provider: StorageProvider,
  ) {}

  uploadFile(input: StorageUploadInput): Promise<void> {
    return this.provider.uploadFile(input);
  }

  deleteFile(bucket: string, key: string): Promise<void> {
    return this.provider.deleteFile(bucket, key);
  }

  getSignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    return this.provider.getSignedUrl(bucket, key, expiresInSeconds);
  }

  getPublicUrl(bucket: string, key: string): string {
    return this.provider.getPublicUrl(bucket, key);
  }

  getMetadata(bucket: string, key: string): Promise<StorageObjectMetadata> {
    return this.provider.getMetadata(bucket, key);
  }

  copyFile(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string,
  ): Promise<void> {
    return this.provider.copyFile(
      sourceBucket,
      sourceKey,
      targetBucket,
      targetKey,
    );
  }

  moveFile(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string,
  ): Promise<void> {
    return this.provider.moveFile(
      sourceBucket,
      sourceKey,
      targetBucket,
      targetKey,
    );
  }
}
