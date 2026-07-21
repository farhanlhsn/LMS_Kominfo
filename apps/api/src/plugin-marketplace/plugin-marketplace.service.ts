import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import { PrismaService } from "../prisma/prisma.service";
import type { OrganizationContext } from "../auth/types/authenticated-request";
import type {
  CreatePluginListingDto,
  CreatePluginReviewDto,
  InstallPluginDto,
  PluginListingStatus,
  UpdatePluginListingDto,
  UpdatePluginListingStatusDto,
  UpdatePluginPolicyDto,
  UpdatePluginReviewStatusDto,
} from "./dto/plugin-marketplace.dto";

@Injectable()
export class PluginMarketplaceService {
  // The Prisma client is cast to `any` to remain forward-compatible with the
  // regenerated prisma types for the new marketplace models.
  private readonly db: any;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.db = prisma as unknown as any;
  }

  // ----------------- Listings -----------------
  async listListings(organizationId: string, status?: string) {
    return this.db.pluginListing.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        _count: { select: { reviews: true, installations: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }

  async getListing(organizationId: string, id: string) {
    const listing = await this.db.pluginListing.findFirst({
      where: { id, organizationId },
      include: {
        reviews: { orderBy: { createdAt: "desc" } },
        installations: { orderBy: { installedAt: "desc" } },
      },
    });
    if (!listing) {
      throw new NotFoundException("Plugin listing not found");
    }
    return listing;
  }

  async createListing(
    organization: OrganizationContext,
    userId: string,
    dto: CreatePluginListingDto,
  ) {
    if (!userId) {
      throw new ForbiddenException("Authenticated user is required");
    }
    const existing = await this.db.pluginListing.findFirst({
      where: {
        organizationId: organization.id,
        pluginId: dto.pluginId,
      },
    });
    if (existing) {
      throw new ConflictException("Plugin listing already exists for this plugin");
    }
    return this.db.pluginListing.create({
      data: {
        organizationId: organization.id,
        pluginId: dto.pluginId,
        name: dto.name,
        description: dto.description,
        longDescription: dto.longDescription,
        categories: (dto.categories ?? []) as Prisma.InputJsonValue,
        screenshots: (dto.screenshots ?? []) as Prisma.InputJsonValue,
        pricing: (dto.pricing ?? {}) as Prisma.InputJsonValue,
        status: "DRAFT",
        reviewedBy: userId,
      },
    });
  }

  async updateListing(
    organizationId: string,
    id: string,
    dto: UpdatePluginListingDto,
  ) {
    const existing = await this.db.pluginListing.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException("Plugin listing not found");
    }
    return this.db.pluginListing.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.longDescription !== undefined
          ? { longDescription: dto.longDescription }
          : {}),
        ...(dto.categories !== undefined
          ? { categories: dto.categories as Prisma.InputJsonValue }
          : {}),
        ...(dto.screenshots !== undefined
          ? { screenshots: dto.screenshots as Prisma.InputJsonValue }
          : {}),
        ...(dto.pricing !== undefined
          ? { pricing: dto.pricing as Prisma.InputJsonValue }
          : {}),
      },
    });
  }

  async updateListingStatus(
    organizationId: string,
    userId: string,
    id: string,
    dto: UpdatePluginListingStatusDto,
  ) {
    const existing = await this.db.pluginListing.findFirst({
      where: { id, organizationId },
    });
    if (!existing) {
      throw new NotFoundException("Plugin listing not found");
    }
    const nextStatus: PluginListingStatus = dto.status;
    const data: Record<string, unknown> = {
      status: nextStatus,
      reviewedBy: userId,
    };
    if (nextStatus === "PUBLISHED" && !existing.publishedAt) {
      data.publishedAt = new Date();
    }
    if (existing.status === "DRAFT" && nextStatus !== "DRAFT") {
      data.submittedAt = existing.submittedAt ?? new Date();
    }
    return this.db.pluginListing.update({
      where: { id },
      data,
    });
  }

  // ----------------- Reviews -----------------
  async listReviews(organizationId: string, listingId?: string) {
    return this.db.pluginReview.findMany({
      where: {
        organizationId,
        ...(listingId ? { listingId } : {}),
      },
      include: {
        reviewer: { select: { id: true, name: true, email: true } },
        listing: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });
  }

  async createReview(
    organization: OrganizationContext,
    userId: string,
    dto: CreatePluginReviewDto,
  ) {
    const listing = await this.db.pluginListing.findFirst({
      where: { id: dto.listingId, organizationId: organization.id },
    });
    if (!listing) {
      throw new NotFoundException("Plugin listing not found");
    }
    return this.db.pluginReview.create({
      data: {
        organizationId: organization.id,
        listingId: dto.listingId,
        reviewerId: userId,
        rating: dto.rating,
        comment: dto.comment,
        status: "PENDING",
      },
    });
  }

  async updateReviewStatus(
    organizationId: string,
    id: string,
    dto: UpdatePluginReviewStatusDto,
  ) {
    const review = await this.db.pluginReview.findFirst({
      where: { id, organizationId },
    });
    if (!review) {
      throw new NotFoundException("Plugin review not found");
    }
    return this.db.pluginReview.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  // ----------------- Installations -----------------
  async listInstallations(organizationId: string) {
    return this.db.pluginInstallation.findMany({
      where: { organizationId },
      include: {
        listing: { select: { id: true, name: true, pluginId: true, status: true } },
      },
      orderBy: { installedAt: "desc" },
    });
  }

  async installPlugin(
    organization: OrganizationContext,
    dto: InstallPluginDto,
  ) {
    const policy = await this.getOrCreatePolicy(organization.id);
    const listing = await this.db.pluginListing.findFirst({
      where: { id: dto.listingId, organizationId: organization.id },
    });
    if (!listing) {
      throw new NotFoundException("Plugin listing not found");
    }
    if (listing.status !== "PUBLISHED") {
      throw new BadRequestException("Only published listings can be installed");
    }
    const activeCount = await this.db.pluginInstallation.count({
      where: { organizationId: organization.id, status: "ACTIVE" },
    });
    if (activeCount >= policy.maxInstalls) {
      throw new BadRequestException(
        `Organization has reached the maximum allowed installs (${policy.maxInstalls})`,
      );
    }
    const allowedCategories = (policy.allowedCategories as string[]) ?? [];
    const listingCategories = (listing.categories as string[]) ?? [];
    if (allowedCategories.length > 0) {
      const intersection = listingCategories.filter((c) =>
        allowedCategories.includes(c),
      );
      if (intersection.length === 0 && listingCategories.length > 0) {
        throw new BadRequestException(
          "Listing categories are not allowed by organization policy",
        );
      }
    }
    const existing = await this.db.pluginInstallation.findFirst({
      where: {
        organizationId: organization.id,
        listingId: dto.listingId,
      },
    });
    if (existing) {
      throw new ConflictException("Plugin already installed");
    }
    const initialStatus = policy.requireApproval ? "DISABLED" : "ACTIVE";
    return this.db.pluginInstallation.create({
      data: {
        organizationId: organization.id,
        listingId: dto.listingId,
        config: (dto.config ?? {}) as Prisma.InputJsonValue,
        status: initialStatus,
      },
    });
  }

  async uninstallPlugin(organizationId: string, id: string) {
    const installation = await this.db.pluginInstallation.findFirst({
      where: { id, organizationId },
    });
    if (!installation) {
      throw new NotFoundException("Plugin installation not found");
    }
    await this.db.pluginInstallation.delete({ where: { id } });
    return { deleted: true, id };
  }

  // ----------------- Policy -----------------
  async getPolicy(organizationId: string) {
    return this.getOrCreatePolicy(organizationId);
  }

  async updatePolicy(
    organizationId: string,
    dto: UpdatePluginPolicyDto,
  ) {
    await this.getOrCreatePolicy(organizationId);
    return this.db.pluginPolicy.update({
      where: { organizationId },
      data: {
        ...(dto.maxInstalls !== undefined ? { maxInstalls: dto.maxInstalls } : {}),
        ...(dto.allowedCategories !== undefined
          ? { allowedCategories: dto.allowedCategories as Prisma.InputJsonValue }
          : {}),
        ...(dto.requireApproval !== undefined
          ? { requireApproval: dto.requireApproval }
          : {}),
      },
    });
  }

  private async getOrCreatePolicy(organizationId: string) {
    const existing = await this.db.pluginPolicy.findUnique({
      where: { organizationId },
    });
    if (existing) return existing;
    return this.db.pluginPolicy.create({
      data: {
        organizationId,
        maxInstalls: 50,
        allowedCategories: [] as unknown as Prisma.InputJsonValue,
        requireApproval: false,
      },
    });
  }
}
