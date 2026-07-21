export interface StorageUploadInput {
  bucket: string;
  key: string;
  body: Buffer;
  mimeType: string;
  metadata?: Record<string, string>;
}

export interface StorageObjectMetadata {
  contentLength?: number;
  contentType?: string;
  etag?: string;
  lastModified?: Date;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  uploadFile(input: StorageUploadInput): Promise<void>;
  deleteFile(bucket: string, key: string): Promise<void>;
  getSignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds?: number,
  ): Promise<string>;
  getPublicUrl(bucket: string, key: string): string;
  getMetadata(bucket: string, key: string): Promise<StorageObjectMetadata>;
  getFile(bucket: string, key: string): Promise<Buffer>;
  copyFile(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string,
  ): Promise<void>;
  moveFile(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string,
  ): Promise<void>;
}
