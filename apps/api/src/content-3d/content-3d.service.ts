import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
  CreateThreeDAssetDto,
  CreateThreeDInteractionDto,
  CreateThreeDSceneDto,
  ThreeDFormat,
  UpdateThreeDAssetDto,
} from "./dto/content-3d.dto";

const ALLOWED_THUMBNAIL_FORMATS: ReadonlySet<ThreeDFormat> = new Set([
  "GLB",
  "GLTF",
  "FBX",
  "OBJ",
]);

function buildMockThumbnail(name: string, format: ThreeDFormat) {
  return `https://placehold.co/512x512?text=${encodeURIComponent(
    `${name}.${format.toLowerCase()}`,
  )}`;
}

@Injectable()
export class Content3DService {
  // The Prisma client is cast to `any` because the generated types for the new
  // 3D models are produced by `prisma generate`, which is owned by the db
  // package. The runtime behaviour is correct regardless.
  private readonly db: any;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.db = prisma as unknown as any;
  }

  async listAssets(organizationId: string, search?: string, format?: string) {
    return this.db.threeDAsset.findMany({
      where: {
        organizationId,
        ...(format && ALLOWED_THUMBNAIL_FORMATS.has(format as ThreeDFormat)
          ? { format }
          : {}),
        ...(search
          ? { name: { contains: search, mode: "insensitive" as const } }
          : {}),
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        _count: { select: { scenes: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async getAsset(organizationId: string, id: string) {
    const asset = await this.db.threeDAsset.findFirst({
      where: { id, organizationId },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
        scenes: {
          orderBy: { createdAt: "desc" },
          include: { interactions: true },
        },
      },
    });
    if (!asset) {
      throw new NotFoundException("3D asset not found");
    }
    return asset;
  }

  async createAsset(
    organization: OrganizationContext,
    userId: string,
    dto: CreateThreeDAssetDto,
  ) {
    const thumbnailUrl = dto.thumbnailUrl ?? buildMockThumbnail(dto.name, dto.format);
    return this.db.threeDAsset.create({
      data: {
        organizationId: organization.id,
        name: dto.name,
        format: dto.format,
        sizeBytes: dto.sizeBytes ?? 0,
        url: dto.url,
        thumbnailUrl,
        uploadedBy: userId,
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async updateAsset(
    organizationId: string,
    id: string,
    dto: UpdateThreeDAssetDto,
  ) {
    const existing = await this.db.threeDAsset.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException("3D asset not found");
    }
    return this.db.threeDAsset.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.format !== undefined ? { format: dto.format } : {}),
        ...(dto.sizeBytes !== undefined ? { sizeBytes: dto.sizeBytes } : {}),
        ...(dto.url !== undefined ? { url: dto.url } : {}),
        ...(dto.thumbnailUrl !== undefined
          ? { thumbnailUrl: dto.thumbnailUrl }
          : {}),
      },
      include: {
        uploader: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async deleteAsset(organizationId: string, id: string) {
    const existing = await this.db.threeDAsset.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException("3D asset not found");
    }
    await this.db.threeDAsset.delete({ where: { id } });
    return { deleted: true, id };
  }

  async generatePreviewThumbnail(organizationId: string, id: string) {
    const asset = await this.db.threeDAsset.findFirst({
      where: { id, organizationId },
    });
    if (!asset) {
      throw new NotFoundException("3D asset not found");
    }
    const thumbnailUrl = buildMockThumbnail(asset.name, asset.format as ThreeDFormat);
    return this.db.threeDAsset.update({
      where: { id },
      data: { thumbnailUrl },
    });
  }

  async listScenes(organizationId: string, assetId: string) {
    await this.ensureAsset(organizationId, assetId);
    return this.db.threeDScene.findMany({
      where: { organizationId, assetId },
      include: { interactions: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async getScene(organizationId: string, sceneId: string) {
    const scene = await this.db.threeDScene.findFirst({
      where: { id: sceneId, organizationId },
      include: {
        interactions: true,
        asset: {
          select: { id: true, name: true, format: true, url: true, thumbnailUrl: true },
        },
      },
    });
    if (!scene) {
      throw new NotFoundException("3D scene not found");
    }
    return scene;
  }

  async createScene(
    organization: OrganizationContext,
    userId: string,
    assetId: string,
    dto: CreateThreeDSceneDto,
  ) {
    await this.ensureAsset(organization.id, assetId);
    return this.db.threeDScene.create({
      data: {
        organizationId: organization.id,
        assetId,
        scene: (dto.scene ?? {}) as Prisma.InputJsonValue,
        version: dto.version ?? 1,
      },
      include: { interactions: true },
    });
  }

  async createInteraction(
    organizationId: string,
    userId: string,
    sceneId: string,
    dto: CreateThreeDInteractionDto,
  ) {
    const scene = await this.db.threeDScene.findFirst({
      where: { id: sceneId, organizationId },
    });
    if (!scene) {
      throw new NotFoundException("3D scene not found");
    }
    return this.db.threeDInteraction.create({
      data: {
        sceneId,
        name: dto.name,
        trigger: dto.trigger,
        action: (dto.action ?? {}) as Prisma.InputJsonValue,
      },
    });
  }

  private async ensureAsset(organizationId: string, assetId: string) {
    const asset = await this.db.threeDAsset.findFirst({
      where: { id: assetId, organizationId },
    });
    if (!asset) {
      throw new NotFoundException("3D asset not found");
    }
    return asset;
  }
}
