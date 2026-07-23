import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PluginMarketplaceService } from "./plugin-marketplace.service";

const org = { id: "org-1" } as any;
const user = { id: "user-1" } as any;
const manifest = {
  key: "plugin.3d_viewer",
  name: "3D Viewer",
  description: "Interactive GLB and GLTF viewer",
  version: "1.0.0",
  category: "ACTIVITY",
  distribution: "MARKETPLACE",
  runtime: { kind: "INTERNAL" },
  workspacePanels: [
    {
      key: "3d-inspector",
      name: "3D Inspector",
      defaultPosition: "right",
    },
  ],
};

function setup(
  options: { requireApproval?: boolean; maxInstalls?: number } = {},
) {
  const listings = new Map<string, any>();
  const installations = new Map<string, any>();
  const reviews = new Map<string, any>();
  const organizationPlugins = new Map<string, any>();
  let policy: any = {
    id: "policy-1",
    organizationId: org.id,
    maxInstalls: options.maxInstalls ?? 50,
    allowedCategories: [],
    requireApproval: options.requireApproval ?? false,
  };

  const prisma: any = {
    $transaction: vi.fn(async (callback: (tx: any) => Promise<unknown>) =>
      callback(prisma),
    ),
    plugin: {
      findUnique: vi.fn(async ({ where }: any) =>
        where.key === manifest.key
          ? { id: "plugin-db-1", key: manifest.key }
          : null,
      ),
    },
    pluginListing: {
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const key = `${where.pluginId_organizationId.organizationId}:${where.pluginId_organizationId.pluginId}`;
        const existing = Array.from(listings.values()).find(
          (item) => `${item.organizationId}:${item.pluginId}` === key,
        );
        if (existing) {
          const next = { ...existing, ...update };
          listings.set(existing.id, next);
          return next;
        }
        const created = {
          id: `listing-${listings.size + 1}`,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...create,
        };
        listings.set(created.id, created);
        return created;
      }),
      findMany: vi.fn(async ({ where }: any) =>
        Array.from(listings.values())
          .filter(
            (item) =>
              item.organizationId === where.organizationId &&
              (!where.status || item.status === where.status),
          )
          .map((item) => ({
            ...item,
            _count: { reviews: 0, installations: installations.size },
            installations: Array.from(installations.values()).filter(
              (installation) =>
                installation.organizationId === where.organizationId &&
                installation.listingId === item.id,
            ),
          })),
      ),
      findFirst: vi.fn(async ({ where, include }: any) => {
        const item =
          Array.from(listings.values()).find(
            (listing) =>
              (!where.id || listing.id === where.id) &&
              (!where.organizationId ||
                listing.organizationId === where.organizationId) &&
              (!where.pluginId || listing.pluginId === where.pluginId),
          ) ?? null;
        if (!item || !include?.installations) return item;
        return {
          ...item,
          installations: Array.from(installations.values()).filter(
            (installation) => installation.listingId === item.id,
          ),
        };
      }),
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `listing-${listings.size + 1}`, ...data };
        listings.set(item.id, item);
        return item;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const next = { ...listings.get(where.id), ...data };
        listings.set(where.id, next);
        return next;
      }),
    },
    pluginInstallation: {
      findMany: vi.fn(async ({ where }: any) =>
        Array.from(installations.values())
          .filter((item) => item.organizationId === where.organizationId)
          .map((item) => ({
            ...item,
            listing: listings.get(item.listingId),
          })),
      ),
      findFirst: vi.fn(async ({ where, include }: any) => {
        const item =
          Array.from(installations.values()).find(
            (installation) =>
              installation.organizationId === where.organizationId &&
              (!where.id || installation.id === where.id) &&
              (!where.listingId || installation.listingId === where.listingId),
          ) ?? null;
        if (!item || !include?.listing) return item;
        return { ...item, listing: listings.get(item.listingId) };
      }),
      count: vi.fn(
        async ({ where }: any) =>
          Array.from(installations.values()).filter(
            (item) =>
              item.organizationId === where.organizationId &&
              item.status === where.status,
          ).length,
      ),
      create: vi.fn(async ({ data }: any) => {
        const item = {
          id: `installation-${installations.size + 1}`,
          installedAt: new Date(),
          ...data,
        };
        installations.set(item.id, item);
        return item;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const next = { ...installations.get(where.id), ...data };
        installations.set(where.id, next);
        return next;
      }),
      delete: vi.fn(async ({ where }: any) => {
        const item = installations.get(where.id);
        installations.delete(where.id);
        return item;
      }),
    },
    organizationPlugin: {
      upsert: vi.fn(async ({ where, update, create }: any) => {
        const key = `${where.organizationId_pluginId.organizationId}:${where.organizationId_pluginId.pluginId}`;
        const next = organizationPlugins.has(key)
          ? { ...organizationPlugins.get(key), ...update }
          : { id: "org-plugin-1", ...create };
        organizationPlugins.set(key, next);
        return next;
      }),
      deleteMany: vi.fn(async () => {
        const count = organizationPlugins.size;
        organizationPlugins.clear();
        return { count };
      }),
    },
    pluginPanel: {
      upsert: vi.fn().mockResolvedValue({ id: "panel-1" }),
      deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    auditLog: {
      create: vi.fn().mockResolvedValue({ id: "audit-1" }),
    },
    pluginReview: {
      findMany: vi.fn(async () => Array.from(reviews.values())),
      findFirst: vi.fn(async ({ where }: any) => reviews.get(where.id) ?? null),
      create: vi.fn(async ({ data }: any) => {
        const item = { id: `review-${reviews.size + 1}`, ...data };
        reviews.set(item.id, item);
        return item;
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const next = { ...reviews.get(where.id), ...data };
        reviews.set(where.id, next);
        return next;
      }),
    },
    pluginPolicy: {
      findUnique: vi.fn(async () => policy),
      create: vi.fn(async ({ data }: any) => {
        policy = { id: "policy-1", ...data };
        return policy;
      }),
      update: vi.fn(async ({ data }: any) => {
        policy = { ...policy, ...data };
        return policy;
      }),
    },
  };
  const registry = {
    ensureRegisteredPlugins: vi.fn(),
    assertCompatible: vi.fn(),
    listMarketplacePlugins: vi.fn().mockReturnValue([manifest]),
    getPlugin: vi.fn((key: string) => {
      if (key === manifest.key) return manifest;
      if (key === "core.text") {
        return { ...manifest, key, distribution: "CORE" };
      }
      throw new NotFoundException();
    }),
  };
  const logger = { log: vi.fn().mockResolvedValue({}) };
  const service = new PluginMarketplaceService(
    prisma,
    registry as any,
    logger as any,
  );
  return {
    service,
    prisma,
    logger,
    listings,
    installations,
    organizationPlugins,
  };
}

describe("PluginMarketplaceService", () => {
  it("materializes official marketplace catalog listings", async () => {
    const { service } = setup();

    const listings = await service.listListings(org.id, "PUBLISHED");

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      pluginId: "plugin.3d_viewer",
      status: "PUBLISHED",
      currentInstallation: null,
    });
  });

  it("installs and enables a published package for one organization", async () => {
    const { service, prisma, logger, organizationPlugins } = setup();
    const [listing] = await service.listListings(org.id, "PUBLISHED");

    const installation = await service.installPlugin(org, user, {
      listingId: listing.id,
    } as any);

    expect(installation.status).toBe("ACTIVE");
    expect(organizationPlugins.size).toBe(1);
    expect(prisma.pluginPanel.upsert).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(logger.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: "plugin.installed" }),
    );
  });

  it("installs disabled when organization approval is required", async () => {
    const { service, organizationPlugins } = setup({ requireApproval: true });
    const [listing] = await service.listListings(org.id, "PUBLISHED");

    const installation = await service.installPlugin(org, user, {
      listingId: listing.id,
    } as any);

    expect(installation.status).toBe("DISABLED");
    expect(Array.from(organizationPlugins.values())[0]?.enabled).toBe(false);
  });

  it("rejects duplicate installs and max-install policy violations", async () => {
    const first = setup();
    const [listing] = await first.service.listListings(org.id, "PUBLISHED");
    await first.service.installPlugin(org, user, {
      listingId: listing.id,
    } as any);
    await expect(
      first.service.installPlugin(org, user, { listingId: listing.id } as any),
    ).rejects.toBeInstanceOf(ConflictException);

    const blocked = setup({ maxInstalls: 0 });
    const [blockedListing] = await blocked.service.listListings(
      org.id,
      "PUBLISHED",
    );
    await expect(
      blocked.service.installPlugin(org, user, {
        listingId: blockedListing.id,
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enables, disables, and uninstalls runtime entitlement", async () => {
    const { service, organizationPlugins, installations, prisma } = setup({
      requireApproval: true,
    });
    const [listing] = await service.listListings(org.id, "PUBLISHED");
    const installed = await service.installPlugin(org, user, {
      listingId: listing.id,
    } as any);

    const enabled = await service.updateInstallationStatus(
      org.id,
      user,
      installed.id,
      { status: "ACTIVE" } as any,
    );
    expect(enabled.status).toBe("ACTIVE");
    expect(Array.from(organizationPlugins.values())[0]?.enabled).toBe(true);

    await service.uninstallPlugin(org.id, user, installed.id);
    expect(installations.size).toBe(0);
    expect(organizationPlugins.size).toBe(0);
    expect(prisma.pluginPanel.deleteMany).toHaveBeenCalled();
  });

  it("rejects unknown and core packages from marketplace listing creation", async () => {
    const { service } = setup();
    await expect(
      service.createListing(org, user.id, {
        pluginId: "plugin.unknown",
        name: "Unknown",
        description: "Unknown",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.createListing(org, user.id, {
        pluginId: "core.text",
        name: "Core text",
        description: "Core",
      } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("handles reviews and organization policy", async () => {
    const { service } = setup();
    const [listing] = await service.listListings(org.id, "PUBLISHED");
    const review = await service.createReview(org, user.id, {
      listingId: listing.id,
      rating: 5,
    } as any);
    const moderated = await service.updateReviewStatus(org.id, review.id, {
      status: "APPROVED",
    } as any);
    expect(moderated.status).toBe("APPROVED");

    const policy = await service.updatePolicy(org.id, {
      maxInstalls: 10,
      allowedCategories: ["ACTIVITY"],
    } as any);
    expect(policy.maxInstalls).toBe(10);
  });
});
