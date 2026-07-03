import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { createHash, randomUUID } from "node:crypto";
import { extname } from "node:path";
import { PrismaService } from "../prisma/prisma.service";
import { StorageService } from "../storage/storage.service";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { FileAccessPolicyService } from "./file-access-policy.service";
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
]);

@Injectable()
export class FilesService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(FileAccessPolicyService)
    private readonly accessPolicy: FileAccessPolicyService,
  ) {}

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
    const purpose = dto.purpose ?? this.purposeFromMime(file.mimetype);

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
        folderId: dto.folderId,
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
    return record;
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
            {
              originalFilename: { contains: query.search, mode: "insensitive" },
            },
            { mimeType: { contains: query.search, mode: "insensitive" } },
          ]
        : undefined,
    };
    const [data, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
        ? this.storage.getPublicUrl(file.bucket, file.key)
        : await this.storage.getSignedUrl(
            file.bucket,
            file.key,
            dto.expiresInSeconds ?? 300,
          );
    await this.audit(
      organization.id,
      userId,
      "file.signed_url.generated",
      fileId,
    );
    return { url, expiresInSeconds: dto.expiresInSeconds ?? 300 };
  }

  async listFolders(organizationId: string) {
    return this.prisma.folder.findMany({
      where: { organizationId, deletedAt: null },
      orderBy: { name: "asc" },
    });
  }

  async createFolder(
    organization: OrganizationContext,
    userId: string,
    dto: CreateFolderDto,
  ) {
    return this.prisma.folder.create({
      data: {
        organizationId: organization.id,
        createdById: userId,
        name: dto.name,
        parentId: dto.parentId,
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
