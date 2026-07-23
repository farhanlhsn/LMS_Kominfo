import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  Optional,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { createHash, createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { extname } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import { RedisService } from "../redis/redis.service";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { FileAccessPolicyService } from "./file-access-policy.service";
import { jwtAccessSecret } from "../common/security/jwt-secrets";
import type {
  CreateFolderDto,
  ListFilesDto,
  SignedUrlDto,
  UploadFileBodyDto,
  UpdateFolderDto,
} from "./dto/files.dto";

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const allowedMimeTypes = new Set([
  "text/plain",
  "text/markdown",
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "video/mp4",
  "video/webm",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  // 3D model formats
  "model/gltf-binary",
  "model/gltf+json",
  "application/octet-stream", // only with 3D extension allowlist below
  "model/obj",
  "model/mtl",
  "text/x-wavefront-obj",
]);
const OCTET_STREAM_EXTENSIONS = new Set([
  "glb",
  "gltf",
  "fbx",
  "obj",
  "mtl",
  "bin",
]);

const FILES_LIST_TTL = 30;

@Injectable()
export class FilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(FileAccessPolicyService)
    private readonly accessPolicy: FileAccessPolicyService,
    @Optional() private readonly redis?: RedisService,
  ) {}

  private filesKey(orgId: string) {
    return `files:list:${orgId}`;
  }

  async upload(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    file: Express.Multer.File | undefined,
    dto: UploadFileBodyDto,
  ) {
    if (!file) {
      throw new BadRequestException("File is required");
    }
    this.validateFile(file);

    const bucket = process.env.S3_BUCKET ?? "lms-local";
    const extension = extname(file.originalname).replace(".", "").toLowerCase();
    const key = `${organization.id}/${new Date().getFullYear()}/${randomUUID()}-${this.safeFilename(file.originalname)}`;
    const checksum = createHash("sha256").update(file.buffer).digest("hex");
    const rawPurpose = dto.purpose ?? this.purposeFromMime(file.mimetype);
    // CONTENT_3D is a frontend hint — map to CONTENT for DB storage
    const purpose = (rawPurpose === "CONTENT_3D" ? "CONTENT" : rawPurpose) as Exclude<typeof rawPurpose, "CONTENT_3D">;
    const folderId = await this.ensureFolderInOrganization(
      organization.id,
      dto.folderId,
    );

    await this.storage.uploadFile({
      bucket,
      key,
      body: file.buffer,
      mimeType: file.mimetype,
      metadata: {
        organizationId: organization.id,
        ownerId: user.id,
      },
    });

    const record = await this.prisma.file.create({
      data: {
        organizationId: organization.id,
        ownerId: user.id,
        folderId,
        bucket,
        key,
        filename: this.safeFilename(file.originalname),
        originalFilename: file.originalname,
        mimeType: file.mimetype,
        extension,
        size: file.size,
        checksum,
        storageProvider: "MINIO",
        visibility: dto.visibility ?? "PRIVATE",
        accessLevel: dto.accessLevel ?? "OWNER",
        purpose,
        processingStatus: "READY",
        metadata: {
          uploadedBy: user.email,
        },
      },
    });

    await this.audit(organization.id, user.id, "file.uploaded", record.id);
    await this.redis?.del(this.filesKey(organization.id));
    return record;
  }

  async createManagedFile(input: {
    organizationId: string;
    ownerId: string;
    filename: string;
    body: Buffer;
    mimeType: string;
    purpose?: "DOCUMENT" | "CERTIFICATE";
    metadata?: Prisma.InputJsonObject;
  }) {
    const safeFilename = this.safeFilename(input.filename);
    const extension = extname(safeFilename).replace(".", "").toLowerCase();
    if (!extension || input.body.length > MAX_FILE_SIZE || !allowedMimeTypes.has(input.mimeType)) {
      throw new BadRequestException("Invalid managed file");
    }
    const bucket = process.env.S3_BUCKET ?? "lms-local";
    const key = `${input.organizationId}/certificates/${new Date().getFullYear()}/${randomUUID()}-${safeFilename}`;
    const checksum = createHash("sha256").update(input.body).digest("hex");

    await this.storage.uploadFile({
      bucket,
      key,
      body: input.body,
      mimeType: input.mimeType,
      metadata: { organizationId: input.organizationId, ownerId: input.ownerId },
    });

    return this.prisma.file.create({
      data: {
        organizationId: input.organizationId,
        ownerId: input.ownerId,
        bucket,
        key,
        filename: safeFilename,
        originalFilename: input.filename,
        mimeType: input.mimeType,
        extension,
        size: input.body.length,
        checksum,
        storageProvider: "MINIO",
        visibility: "PRIVATE",
        accessLevel: "OWNER",
        purpose: input.purpose ?? "DOCUMENT",
        processingStatus: "READY",
        metadata: input.metadata ?? {},
      },
    });
  }

  async managedSignedUrl(organizationId: string, fileId: string, expiresInSeconds = 300) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, organizationId, deletedAt: null },
    });
    if (!file) throw new NotFoundException("Certificate file not found");
    const url = this.privateContentUrl(file, expiresInSeconds);
    return { url, expiresInSeconds };
  }

  async deleteManagedFile(organizationId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({ where: { id: fileId, organizationId, deletedAt: null } });
    if (!file) return;
    await this.storage.deleteFile(file.bucket, file.key);
    await this.prisma.file.update({ where: { id: file.id }, data: { deletedAt: new Date() } });
  }

  async list(organizationId: string, query: ListFilesDto) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    const where: Prisma.FileWhereInput = {
      organizationId,
      deletedAt: null,
      folderId: query.folderId,
      purpose: query.purpose as never,
      OR: query.search
        ? [
            { filename: { contains: query.search, mode: "insensitive" } },
            { originalFilename: { contains: query.search, mode: "insensitive" } },
            { mimeType: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const fetcher = () => Promise.all([
      this.prisma.file.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      this.prisma.file.count({ where }),
    ]).then(([data, total]) => ({
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    }));

    // Only cache unfiltered page-1 requests with results
    if (!query.search && !query.folderId && !query.purpose && page === 1 && this.redis) {
      const cached = await this.redis.get<{ data: unknown[]; meta: unknown }>(this.filesKey(organizationId));
      if (cached !== null && cached.data.length > 0) return cached;
      const result = await fetcher();
      if (result.data.length > 0) await this.redis.set(this.filesKey(organizationId), result, FILES_LIST_TTL);
      return result;
    }
    return fetcher();
  }

  async get(organization: OrganizationContext, userId: string, fileId: string) {
    return this.accessPolicy.ensureCanReadFile(organization, userId, fileId);
  }

  async delete(
    organization: OrganizationContext,
    userId: string,
    fileId: string,
  ) {
    const file = await this.accessPolicy.ensureCanManageFile(
      organization,
      userId,
      fileId,
    );
    await this.storage.deleteFile(file.bucket, file.key);
    const deleted = await this.prisma.file.update({
      where: { id: fileId },
      data: { deletedAt: new Date() },
    });
    await this.audit(organization.id, userId, "file.deleted", fileId);
    await this.redis?.del(this.filesKey(organization.id));
    return deleted;
  }

  async signedUrl(
    organization: OrganizationContext,
    userId: string,
    fileId: string,
    dto: SignedUrlDto,
    courseId?: string,
  ) {
    const file = await this.accessPolicy.ensureCanReadFile(
      organization,
      userId,
      fileId,
      courseId,
    );
    const url =
      file.visibility === "PUBLIC"
        ? `${this.apiBaseUrl()}/files/public/${encodeURIComponent(file.id)}`
        : this.privateContentUrl(file, dto.expiresInSeconds ?? 300);
    await this.audit(
      organization.id,
      userId,
      "file.signed_url.generated",
      fileId,
    );
    return { url, expiresInSeconds: dto.expiresInSeconds ?? 300 };
  }

  async publicContent(fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, visibility: "PUBLIC", deletedAt: null },
    });
    if (!file) throw new NotFoundException("Public file not found");
    return this.readContent(file);
  }

  async signedContent(fileId: string, expires: string, token: string) {
    const expiresAt = Number(expires);
    if (
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      throw new ForbiddenException("File URL has expired");
    }
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, deletedAt: null },
    });
    if (!file) throw new NotFoundException("File not found");
    if (!file.organizationId) {
      throw new ForbiddenException("File is not tenant-scoped");
    }
    const expected = this.contentToken(file.id, file.organizationId, expiresAt);
    const received = Buffer.from(token);
    const expectedBuffer = Buffer.from(expected);
    if (
      received.length !== expectedBuffer.length ||
      !timingSafeEqual(received, expectedBuffer)
    ) {
      throw new ForbiddenException("Invalid file URL");
    }
    return this.readContent(file);
  }

  async listFolders(organizationId: string) {
    return this.prisma.folder.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
      take: 200,
    });
  }

  async createFolder(
    organization: OrganizationContext,
    userId: string,
    dto: CreateFolderDto,
  ) {
    const parentId = await this.ensureFolderInOrganization(
      organization.id,
      dto.parentId,
    );
    return this.prisma.folder.create({
      data: {
        organizationId: organization.id,
        createdById: userId,
        name: dto.name,
        parentId,
      },
    });
  }

  async updateFolder(
    organizationId: string,
    folderId: string,
    dto: UpdateFolderDto,
  ) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, organizationId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException("Folder not found");
    }
    return this.prisma.folder.update({
      where: { id: folderId },
      data: { name: dto.name },
    });
  }

  async deleteFolder(organizationId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, organizationId, deletedAt: null },
    });
    if (!folder) {
      throw new NotFoundException("Folder not found");
    }
    return this.prisma.folder.update({
      where: { id: folderId },
      data: { deletedAt: new Date() },
    });
  }

  validateFile(file: Express.Multer.File) {
    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException("File exceeds maximum size");
    }
    if (!allowedMimeTypes.has(file.mimetype)) {
      throw new BadRequestException("Unsupported file type");
    }
    const extension = extname(file.originalname).replace(".", "").toLowerCase();
    if (!extension) {
      throw new BadRequestException("File extension is required");
    }
    if (
      file.mimetype === "application/octet-stream" &&
      !OCTET_STREAM_EXTENSIONS.has(extension)
    ) {
      throw new BadRequestException(
        "application/octet-stream only allowed for 3D model extensions",
      );
    }
  }

  private purposeFromMime(mimeType: string) {
    if (mimeType.startsWith("video/")) {
      return "VIDEO" as const;
    }
    if (mimeType === "application/pdf") {
      return "DOCUMENT" as const;
    }
    return "CONTENT" as const;
  }

  private safeFilename(filename: string) {
    return filename.replace(/[^a-zA-Z0-9._-]/g, "-").toLowerCase();
  }

  private privateContentUrl(
    file: { id: string; organizationId: string | null },
    expiresInSeconds: number,
  ) {
    if (!file.organizationId) {
      throw new ForbiddenException("File is not tenant-scoped");
    }
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const token = this.contentToken(file.id, file.organizationId, expires);
    return `${this.apiBaseUrl()}/files/content/${encodeURIComponent(file.id)}?expires=${expires}&token=${encodeURIComponent(token)}`;
  }

  private contentToken(fileId: string, organizationId: string, expires: number) {
    const secret = process.env.FILE_URL_SIGNING_SECRET || jwtAccessSecret();
    return createHmac("sha256", secret)
      .update(`${fileId}.${organizationId}.${expires}`)
      .digest("base64url");
  }

  private apiBaseUrl() {
    const configured = process.env.PUBLIC_API_URL?.replace(/\/+$/, "");
    if (configured) return configured;
    const appUrl = process.env.PUBLIC_APP_URL?.replace(/\/+$/, "");
    if (process.env.NODE_ENV === "production" && appUrl) {
      return `${appUrl}/api/v1`;
    }
    return `http://localhost:${process.env.API_PORT ?? 4000}/api/v1`;
  }

  private async readContent(file: {
    bucket: string;
    key: string;
    mimeType: string;
    originalFilename: string;
  }) {
    return {
      body: await this.storage.getFile(file.bucket, file.key),
      mimeType: file.mimeType,
      filename: file.originalFilename,
    };
  }

  private async ensureFolderInOrganization(
    organizationId: string,
    folderId?: string,
  ) {
    if (!folderId) {
      return null;
    }
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, organizationId, deletedAt: null },
      select: { id: true },
    });
    if (!folder) {
      throw new BadRequestException("Folder does not belong to the active organization");
    }
    return folder.id;
  }

  private async audit(
    organizationId: string,
    userId: string,
    action: string,
    entityId: string,
  ) {
    await this.prisma.auditLog.create({
      data: {
        organizationId,
        userId,
        action,
        entityType: "File",
        entityId,
      },
    });
  }
}
