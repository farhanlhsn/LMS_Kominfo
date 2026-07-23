import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@lms/db";
import type {
  AuthenticatedUser,
  OrganizationContext,
} from "../auth/types/authenticated-request";
import { PluginExecutionLogger } from "../plugins/plugin-execution-logger.service";
import { PluginRegistry } from "../plugins/plugin-registry.service";
import { PrismaService } from "../prisma/prisma.service";
import type {
  CreatePluginListingDto,
  CreatePluginReviewDto,
  InstallPluginDto,
  PluginInstallationStatus,
  PluginListingStatus,
  UpdatePluginInstallationStatusDto,
  UpdatePluginListingDto,
  UpdatePluginListingStatusDto,
  UpdatePluginPolicyDto,
  UpdatePluginReviewStatusDto,
} from "./dto/plugin-marketplace.dto";

@Injectable()
export class PluginMarketplaceService {
  private readonly db: any;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(PluginRegistry) private readonly registry: PluginRegistry,
    @Inject(PluginExecutionLogger)
    private readonly executionLogger: PluginExecutionLogger,
  ) {
    this.db = prisma as unknown as any;
  }

  async listListings(organizationId: string, status?: string) {
    await this.ensureCatalogListings(organizationId);
    const listings = await this.db.pluginListing.findMany({
      where: {
        organizationId,
        ...(status ? { status } : {}),
      },
      include: {
        _count: { select: { reviews: true, installations: true } },
        installations: {
          where: { organizationId },
          select: { id: true, status: true, installedAt: true },
          take: 1,
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    });
    return listings.map((listing: Record<string, any>) => ({
      ...listing,
      dependencies:
        this.registry.getPlugin(listing.pluginId).dependencies ?? [],
      currentInstallation: listing.installations?.[0] ?? null,
      installations: undefined,
    }));
  }

  async getListing(organizationId: string, id: string) {
    await this.ensureCatalogListings(organizationId);
    const listing = await this.db.pluginListing.findFirst({
      where: { id, organizationId },
      include: {
        reviews: { orderBy: { createdAt: "desc" } },
        installations: {
          where: { organizationId },
          orderBy: { installedAt: "desc" },
        },
      },
    });
    if (!listing) {
      throw new NotFoundException("Plugin listing not found");
    }
    return {
      ...listing,
      dependencies:
        this.registry.getPlugin(listing.pluginId).dependencies ?? [],
      currentInstallation: listing.installations?.[0] ?? null,
    };
  }

  async createListing(
    organization: OrganizationContext,
    userId: string,
    dto: CreatePluginListingDto,
  ) {
    if (!userId) {
      throw new ForbiddenException("Authenticated user is required");
    }
    const manifest = this.getMarketplaceManifest(dto.pluginId);
    const existing = await this.db.pluginListing.findFirst({
      where: {
        organizationId: organization.id,
        pluginId: manifest.key,
      },
    });
    if (existing) {
      throw new ConflictException(
        "Plugin listing already exists for this plugin",
      );
    }
    return this.db.pluginListing.create({
      data: {
        organizationId: organization.id,
        pluginId: manifest.key,
        name: dto.name,
        description: dto.description,
        longDescription: dto.longDescription,
        categories: (dto.categories ?? [
          manifest.category,
        ]) as Prisma.InputJsonValue,
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
    await this.findOwnedListing(organizationId, id);
    return this.db.pluginListing.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
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
    const existing = await this.findOwnedListing(organizationId, id);
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
    return this.db.pluginListing.update({ where: { id }, data });
  }

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
    await this.findOwnedListing(organization.id, dto.listingId);
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

  async listInstallations(organizationId: string) {
    return this.db.pluginInstallation.findMany({
      where: { organizationId },
      include: {
        listing: {
          select: {
            id: true,
            name: true,
            description: true,
            pluginId: true,
            status: true,
          },
        },
      },
      orderBy: { installedAt: "desc" },
    });
  }

  async installPlugin(
    organization: OrganizationContext,
    user: AuthenticatedUser,
    dto: InstallPluginDto,
  ) {
    await this.ensureCatalogListings(organization.id);
    const policy = await this.getOrCreatePolicy(organization.id);
    const listing = await this.findOwnedListing(organization.id, dto.listingId);
    if (listing.status !== "PUBLISHED") {
      throw new BadRequestException("Only published listings can be installed");
    }
    const manifest = this.getMarketplaceManifest(listing.pluginId);
    this.registry.assertCompatible(manifest.key);
    await this.registry.assertDependenciesEnabled?.(
      organization.id,
      manifest.key,
    );
    const activeCount = await this.db.pluginInstallation.count({
      where: { organizationId: organization.id, status: "ACTIVE" },
    });
    if (!policy.requireApproval && activeCount >= policy.maxInstalls) {
      throw new BadRequestException(
        `Organization has reached the maximum allowed installs (${policy.maxInstalls})`,
      );
    }
    this.enforceCategoryPolicy(
      (policy.allowedCategories as string[]) ?? [],
      (listing.categories as string[]) ?? [],
    );
    const existing = await this.db.pluginInstallation.findFirst({
      where: {
        organizationId: organization.id,
        listingId: dto.listingId,
      },
    });
    if (existing) {
      throw new ConflictException("Plugin already installed");
    }

    const plugin = await this.prisma.plugin.findUnique({
      where: { key: manifest.key },
    });
    if (!plugin) {
      throw new BadRequestException("Plugin package is not registered");
    }
    const initialStatus: PluginInstallationStatus = policy.requireApproval
      ? "DISABLED"
      : "ACTIVE";
    const enabled = initialStatus === "ACTIVE";

    const installation = await this.runTransaction(async (tx) => {
      const created = await tx.pluginInstallation.create({
        data: {
          organizationId: organization.id,
          listingId: dto.listingId,
          config: (dto.config ?? {}) as Prisma.InputJsonValue,
          status: initialStatus,
        },
      });
      await tx.organizationPlugin.upsert({
        where: {
          organizationId_pluginId: {
            organizationId: organization.id,
            pluginId: plugin.id,
          },
        },
        update: {
          enabled,
          config: (dto.config ?? {}) as Prisma.InputJsonValue,
          installedById: user.id,
        },
        create: {
          organizationId: organization.id,
          pluginId: plugin.id,
          enabled,
          config: (dto.config ?? {}) as Prisma.InputJsonValue,
          installedById: user.id,
        },
      });
      await this.registerWorkspacePanels(tx, organization.id, manifest);
      await this.writeAudit(tx, {
        organizationId: organization.id,
        userId: user.id,
        action: "plugin.installed",
        pluginId: plugin.id,
        metadata: {
          pluginKey: manifest.key,
          listingId: listing.id,
          status: initialStatus,
        },
      });
      return created;
    });

    await this.executionLogger.log({
      organizationId: organization.id,
      pluginId: plugin.id,
      userId: user.id,
      action: "plugin.installed",
      status: "SUCCESS",
      output: { listingId: listing.id, enabled },
    });
    return { ...installation, listing };
  }

  async updateInstallationStatus(
    organizationId: string,
    user: AuthenticatedUser,
    id: string,
    dto: UpdatePluginInstallationStatusDto,
  ) {
    const installation = await this.findInstallation(organizationId, id);
    const manifest = this.getMarketplaceManifest(installation.listing.pluginId);
    this.registry.assertCompatible(manifest.key);
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: manifest.key },
    });
    if (!plugin) throw new NotFoundException("Plugin package not found");
    const enabled = dto.status === "ACTIVE";
    if (enabled && installation.listing.status !== "PUBLISHED") {
      throw new BadRequestException(
        "Suspended or archived plugins cannot be enabled",
      );
    }
    if (enabled) {
      await this.registry.assertDependenciesEnabled?.(
        organizationId,
        manifest.key,
      );
    } else {
      await this.registry.assertCanDisable?.(organizationId, manifest.key);
    }
    if (enabled && installation.status !== "ACTIVE") {
      const policy = await this.getOrCreatePolicy(organizationId);
      const activeCount = await this.db.pluginInstallation.count({
        where: { organizationId, status: "ACTIVE" },
      });
      if (activeCount >= policy.maxInstalls) {
        throw new BadRequestException(
          `Organization has reached the maximum allowed installs (${policy.maxInstalls})`,
        );
      }
      this.enforceCategoryPolicy(
        (policy.allowedCategories as string[]) ?? [],
        (installation.listing.categories as string[]) ?? [],
      );
    }

    const updated = await this.runTransaction(async (tx) => {
      const result = await tx.pluginInstallation.update({
        where: { id },
        data: { status: dto.status },
      });
      await tx.organizationPlugin.upsert({
        where: {
          organizationId_pluginId: {
            organizationId,
            pluginId: plugin.id,
          },
        },
        update: { enabled },
        create: {
          organizationId,
          pluginId: plugin.id,
          enabled,
          config: installation.config ?? {},
          installedById: user.id,
        },
      });
      await this.writeAudit(tx, {
        organizationId,
        userId: user.id,
        action: enabled ? "plugin.enabled" : "plugin.disabled",
        pluginId: plugin.id,
        metadata: { pluginKey: manifest.key, installationId: id },
      });
      return result;
    });

    await this.executionLogger.log({
      organizationId,
      pluginId: plugin.id,
      userId: user.id,
      action: enabled ? "plugin.enabled" : "plugin.disabled",
      status: "SUCCESS",
      output: { installationId: id },
    });
    return { ...updated, listing: installation.listing };
  }

  async uninstallPlugin(
    organizationId: string,
    user: AuthenticatedUser,
    id: string,
  ) {
    const installation = await this.findInstallation(organizationId, id);
    const manifest = this.getMarketplaceManifest(installation.listing.pluginId);
    await this.registry.assertCanDisable?.(organizationId, manifest.key);
    const plugin = await this.prisma.plugin.findUnique({
      where: { key: manifest.key },
    });
    if (!plugin) throw new NotFoundException("Plugin package not found");

    await this.runTransaction(async (tx) => {
      await tx.organizationPlugin.deleteMany({
        where: { organizationId, pluginId: plugin.id },
      });
      await tx.pluginPanel.deleteMany({
        where: { organizationId, pluginId: manifest.key },
      });
      await tx.pluginInstallation.delete({ where: { id } });
      await this.writeAudit(tx, {
        organizationId,
        userId: user.id,
        action: "plugin.uninstalled",
        pluginId: plugin.id,
        metadata: { pluginKey: manifest.key, installationId: id },
      });
    });
    await this.executionLogger.log({
      organizationId,
      pluginId: plugin.id,
      userId: user.id,
      action: "plugin.uninstalled",
      status: "SUCCESS",
      output: { installationId: id },
    });
    return { deleted: true, id };
  }

  async getPolicy(organizationId: string) {
    return this.getOrCreatePolicy(organizationId);
  }

  async updatePolicy(organizationId: string, dto: UpdatePluginPolicyDto) {
    await this.getOrCreatePolicy(organizationId);
    return this.db.pluginPolicy.update({
      where: { organizationId },
      data: {
        ...(dto.maxInstalls !== undefined
          ? { maxInstalls: dto.maxInstalls }
          : {}),
        ...(dto.allowedCategories !== undefined
          ? {
              allowedCategories: dto.allowedCategories as Prisma.InputJsonValue,
            }
          : {}),
        ...(dto.requireApproval !== undefined
          ? { requireApproval: dto.requireApproval }
          : {}),
      },
    });
  }

  private async ensureCatalogListings(organizationId: string) {
    await this.registry.ensureRegisteredPlugins();
    for (const manifest of this.registry.listMarketplacePlugins()) {
      await this.db.pluginListing.upsert({
        where: {
          pluginId_organizationId: {
            pluginId: manifest.key,
            organizationId,
          },
        },
        update: {
          name: manifest.name,
          description: manifest.description ?? manifest.name,
          longDescription: manifest.description,
          categories: [manifest.category] as Prisma.InputJsonValue,
          pricing: {
            model: "FREE",
            price: 0,
            currency: "IDR",
            official: true,
            version: manifest.version,
          } as Prisma.InputJsonValue,
        },
        create: {
          pluginId: manifest.key,
          organizationId,
          name: manifest.name,
          description: manifest.description ?? manifest.name,
          longDescription: manifest.description,
          categories: [manifest.category] as Prisma.InputJsonValue,
          screenshots: [] as Prisma.InputJsonValue,
          pricing: {
            model: "FREE",
            price: 0,
            currency: "IDR",
            official: true,
            version: manifest.version,
          } as Prisma.InputJsonValue,
          status: "PUBLISHED",
          submittedAt: new Date(),
          publishedAt: new Date(),
        },
      });
    }
  }

  private getMarketplaceManifest(pluginKey: string) {
    let manifest;
    try {
      manifest = this.registry.getPlugin(pluginKey);
    } catch {
      throw new BadRequestException(
        "Plugin package must have a validated manifest before listing",
      );
    }
    if (manifest.distribution !== "MARKETPLACE") {
      throw new BadRequestException("Core plugins cannot be installed");
    }
    return manifest;
  }

  private async findOwnedListing(organizationId: string, id: string) {
    const listing = await this.db.pluginListing.findFirst({
      where: { id, organizationId },
    });
    if (!listing) throw new NotFoundException("Plugin listing not found");
    return listing;
  }

  private async findInstallation(organizationId: string, id: string) {
    const installation = await this.db.pluginInstallation.findFirst({
      where: { id, organizationId },
      include: {
        listing: {
          select: {
            id: true,
            pluginId: true,
            name: true,
            status: true,
            categories: true,
          },
        },
      },
    });
    if (!installation) {
      throw new NotFoundException("Plugin installation not found");
    }
    return installation;
  }

  private enforceCategoryPolicy(
    allowedCategories: string[],
    listingCategories: string[],
  ) {
    if (allowedCategories.length === 0 || listingCategories.length === 0)
      return;
    if (
      !listingCategories.some((category) =>
        allowedCategories.includes(category),
      )
    ) {
      throw new BadRequestException(
        "Listing categories are not allowed by organization policy",
      );
    }
  }

  private async registerWorkspacePanels(
    tx: any,
    organizationId: string,
    manifest: ReturnType<PluginMarketplaceService["getMarketplaceManifest"]>,
  ) {
    for (const panel of manifest.workspacePanels ?? []) {
      await tx.pluginPanel.upsert({
        where: {
          organizationId_pluginId_panelKey: {
            organizationId,
            pluginId: manifest.key,
            panelKey: panel.key,
          },
        },
        update: {
          name: panel.name,
          defaultSize: panel.defaultSize ?? "md",
          defaultPosition: panel.defaultPosition ?? "right",
          allowedRoutes: (panel.allowedRoutes ?? []) as Prisma.InputJsonValue,
          configSchema: (panel.configSchema ?? {}) as Prisma.InputJsonValue,
        },
        create: {
          organizationId,
          pluginId: manifest.key,
          panelKey: panel.key,
          name: panel.name,
          defaultSize: panel.defaultSize ?? "md",
          defaultPosition: panel.defaultPosition ?? "right",
          allowedRoutes: (panel.allowedRoutes ?? []) as Prisma.InputJsonValue,
          configSchema: (panel.configSchema ?? {}) as Prisma.InputJsonValue,
        },
      });
    }
  }

  private async writeAudit(
    tx: any,
    input: {
      organizationId: string;
      userId: string;
      action: string;
      pluginId: string;
      metadata: Record<string, unknown>;
    },
  ) {
    await tx.auditLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        entityType: "Plugin",
        entityId: input.pluginId,
        severity: "INFO",
        metadata: input.metadata as Prisma.InputJsonObject,
      },
    });
  }

  private async runTransaction<T>(callback: (tx: any) => Promise<T>) {
    if (typeof this.db.$transaction === "function") {
      return this.db.$transaction(callback);
    }
    return callback(this.db);
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
