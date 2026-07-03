import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import { FileAccessPolicyService } from "../files/file-access-policy.service";
import { ContentProcessingService } from "../content-processing/content-processing.service";
import type {
  CreateContentLibraryItemDto,
  UpdateContentLibraryItemDto,
} from "./dto/content-library.dto";

@Injectable()
export class ContentLibraryService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(FileAccessPolicyService)
    private readonly fileAccessPolicy: FileAccessPolicyService,
    @Inject(ContentProcessingService)
    private readonly contentProcessing: ContentProcessingService,
  ) {}

  async list(
    organizationId: string,
    query: { search?: string; type?: string },
  ) {
    return this.prisma.contentLibraryItem.findMany({
      where: {
        organizationId,
        deletedAt: null,
        type: query.type as never,
        OR: query.search
          ? [
              { title: { contains: query.search, mode: "insensitive" } },
              { description: { contains: query.search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { file: true },
      orderBy: { createdAt: "desc" },
    });
  }

  async create(
    organization: OrganizationContext,
    userId: string,
    dto: CreateContentLibraryItemDto,
  ) {
    if (dto.fileId) {
      await this.fileAccessPolicy.ensureCanReadFile(
        organization,
        userId,
        dto.fileId,
      );
    }

    const item = await this.prisma.contentLibraryItem.create({
      data: {
        organizationId: organization.id,
        createdById: userId,
        fileId: dto.fileId,
        title: dto.title,
        description: dto.description,
        type: dto.type,
        tags: (dto.tags ?? []) as Prisma.InputJsonArray,
        metadata: (dto.metadata ?? {}) as Prisma.InputJsonObject,
      },
      include: { file: true },
    });
    await this.contentProcessing.enqueue("CONTENT_CREATED", {
      organizationId: organization.id,
      itemId: item.id,
    });
    if (dto.fileId) {
      await this.contentProcessing.enqueue("AI_INDEXING_REQUESTED", {
        organizationId: organization.id,
        fileId: dto.fileId,
        itemId: item.id,
      });
    }
    return item;
  }

  async get(organizationId: string, itemId: string) {
    const item = await this.prisma.contentLibraryItem.findFirst({
      where: { id: itemId, organizationId, deletedAt: null },
      include: { file: true },
    });
    if (!item) {
      throw new NotFoundException("Content library item not found");
    }
    return item;
  }

  async update(
    organizationId: string,
    itemId: string,
    dto: UpdateContentLibraryItemDto,
  ) {
    await this.get(organizationId, itemId);
    const item = await this.prisma.contentLibraryItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags ? (dto.tags as Prisma.InputJsonArray) : undefined,
        metadata: dto.metadata
          ? (dto.metadata as Prisma.InputJsonObject)
          : undefined,
      },
      include: { file: true },
    });
    await this.contentProcessing.enqueue("CONTENT_UPDATED", {
      organizationId,
      itemId,
    });
    return item;
  }

  async delete(organizationId: string, itemId: string) {
    await this.get(organizationId, itemId);
    return this.prisma.contentLibraryItem.update({
      where: { id: itemId },
      data: { deletedAt: new Date() },
    });
  }
}
