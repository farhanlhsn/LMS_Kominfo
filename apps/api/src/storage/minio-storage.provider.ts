import {
  CopyObjectCommand,
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Injectable } from "@nestjs/common";
import type {
  StorageObjectMetadata,
  StorageProvider,
  StorageUploadInput,
} from "./storage-provider.interface";

@Injectable()
export class MinioStorageProvider implements StorageProvider {
  private readonly ensuredBuckets = new Set<string>();
  private readonly client = new S3Client({
    region: process.env.S3_REGION ?? "local",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minio",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minio_password",
    },
  });

  async uploadFile(input: StorageUploadInput): Promise<void> {
    await this.ensureBucket(input.bucket);
    await this.client.send(
      new PutObjectCommand({
        Bucket: input.bucket,
        Key: input.key,
        Body: input.body,
        ContentType: input.mimeType,
        Metadata: input.metadata,
      }),
    );
  }

  private async ensureBucket(bucket: string) {
    if (this.ensuredBuckets.has(bucket)) {
      return;
    }

    try {
      await this.client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await this.client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
    this.ensuredBuckets.add(bucket);
  }

  async deleteFile(bucket: string, key: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: bucket, Key: key }),
    );
  }

  async getSignedUrl(
    bucket: string,
    key: string,
    expiresInSeconds = 300,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  getPublicUrl(bucket: string, key: string): string {
    const endpoint = process.env.S3_PUBLIC_ENDPOINT ?? process.env.S3_ENDPOINT;
    return `${endpoint?.replace(/\/$/, "")}/${bucket}/${key}`;
  }

  async getMetadata(
    bucket: string,
    key: string,
  ): Promise<StorageObjectMetadata> {
    const metadata = await this.client.send(
      new HeadObjectCommand({ Bucket: bucket, Key: key }),
    );
    return {
      contentLength: metadata.ContentLength,
      contentType: metadata.ContentType,
      etag: metadata.ETag,
      lastModified: metadata.LastModified,
      metadata: metadata.Metadata,
    };
  }

  async getFile(bucket: string, key: string): Promise<Buffer> {
    const object = await this.client.send(
      new GetObjectCommand({ Bucket: bucket, Key: key }),
    );
    if (!object.Body) return Buffer.alloc(0);
    return Buffer.from(await object.Body.transformToByteArray());
  }

  async copyFile(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string,
  ): Promise<void> {
    await this.client.send(
      new CopyObjectCommand({
        Bucket: targetBucket,
        Key: targetKey,
        CopySource: `${sourceBucket}/${sourceKey}`,
      }),
    );
  }

  async moveFile(
    sourceBucket: string,
    sourceKey: string,
    targetBucket: string,
    targetKey: string,
  ): Promise<void> {
    await this.copyFile(sourceBucket, sourceKey, targetBucket, targetKey);
    await this.deleteFile(sourceBucket, sourceKey);
  }
}

export class S3CompatibleStorageProvider extends MinioStorageProvider {}
