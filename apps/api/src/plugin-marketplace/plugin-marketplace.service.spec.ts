import { describe, expect, it, vi } from "vitest";
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from "@nestjs/common";
import { PluginMarketplaceService } from "./plugin-marketplace.service";

const org = {
  id: "org-a",
  slug: "a",
  name: "A",
  memberId: "m1",
  roleKeys: ["org_admin"],
  permissionKeys: ["plugins:configure"],
  isPlatformAdmin: false,
};

function setup() {
  const listings = new Map<string, Record<string, any>>();
  const reviews = new Map<string, Record<string, any>>();
  const installations = new Map<string, Record<string, any>>();
  let policy: Record<string, any> | null = null;

  const prisma: any = {
    pluginListing: {
      findMany: vi.fn(async (args: any) =>
        Array.from(listings.values()).filter(
          (l) =>
            l.organizationId === args?.where?.organizationId &&
            (!args.where.status || l.status === args.where.status),
        ),
      ),
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(listings.values());
        return (
          list.find(
            (l) =>
              l.organizationId === args?.where?.organizationId &&
              (args.where.id ? l.id === args.where.id : true) &&
              (args.where.pluginId
                ? l.pluginId === args.where.pluginId
                : true),
          ) ?? null
        );
      }),
      create: vi.fn(async (args: any) => {
        const id = `listing-${listings.size + 1}`;
        const listing = { id, ...args.data };
        listings.set(id, listing);
        return listing;
      }),
      update: vi.fn(async (args: any) => {
        const existing = listings.get(args.where.id);
        const updated = { ...existing, ...args.data };
        listings.set(args.where.id, updated);
        return updated;
      }),
    },
    pluginReview: {
      findMany: vi.fn(async (args: any) =>
        Array.from(reviews.values()).filter(
          (r) =>
            r.organizationId === args?.where?.organizationId &&
            (!args.where.listingId || r.listingId === args.where.listingId),
        ),
      ),
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(reviews.values());
        return (
          list.find(
            (r) =>
              r.organizationId === args?.where?.organizationId &&
              r.id === args.where.id,
          ) ?? null
        );
      }),
      create: vi.fn(async (args: any) => {
        const id = `rev-${reviews.size + 1}`;
        const review = { id, ...args.data };
        reviews.set(id, review);
        return review;
      }),
      update: vi.fn(async (args: any) => {
        const existing = reviews.get(args.where.id);
        const updated = { ...existing, ...args.data };
        reviews.set(args.where.id, updated);
        return updated;
      }),
    },
    pluginInstallation: {
      findMany: vi.fn(async (args: any) =>
        Array.from(installations.values()).filter(
          (i) => i.organizationId === args?.where?.organizationId,
        ),
      ),
      findFirst: vi.fn(async (args: any) => {
        const list = Array.from(installations.values());
        return (
          list.find(
            (i) =>
              i.organizationId === args?.where?.organizationId &&
              (args.where.id ? i.id === args.where.id : true) &&
              (args.where.listingId
                ? i.listingId === args.where.listingId
                : true),
          ) ?? null
        );
      }),
      count: vi.fn(async (args: any) =>
        Array.from(installations.values()).filter(
          (i) =>
            i.organizationId === args?.where?.organizationId &&
            i.status === args.where.status,
        ).length,
      ),
      create: vi.fn(async (args: any) => {
        const id = `inst-${installations.size + 1}`;
        const installation = { id, ...args.data };
        installations.set(id, installation);
        return installation;
      }),
      delete: vi.fn(async (args: any) => {
        installations.delete(args.where.id);
        return { id: args.where.id };
      }),
    },
    pluginPolicy: {
      findUnique: vi.fn(async (args: any) => {
        if (!policy) return null;
        if (policy.organizationId === args?.where?.organizationId) return policy;
        return null;
      }),
      create: vi.fn(async (args: any) => {
        policy = { id: "policy-1", ...args.data };
        return policy;
      }),
      update: vi.fn(async (args: any) => {
        policy = { ...(policy ?? {}), ...args.data };
        return policy;
      }),
    },
  };

  return {
    service: new PluginMarketplaceService(prisma),
    prisma,
    listings,
    reviews,
    installations,
    getPolicy: () => policy,
  };
}

describe("PluginMarketplaceService", () => {
  it("creates a draft listing", async () => {
    const { service, listings } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.code_runner",
      name: "Code Runner",
      description: "Run code safely",
    } as any);
    expect(listing.status).toBe("DRAFT");
    expect(listings.size).toBe(1);
  });

  it("throws when a listing already exists for the same plugin", async () => {
    const { service } = setup();
    await service.createListing(org, "u1", {
      pluginId: "plugin.code_runner",
      name: "Code Runner",
      description: "Run code",
    } as any);
    await expect(
      service.createListing(org, "u1", {
        pluginId: "plugin.code_runner",
        name: "Code Runner 2",
        description: "Run code",
      } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("transitions status to PUBLISHED and sets publishedAt", async () => {
    const { service, listings } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D Viewer",
      description: "View 3D",
    } as any);
    const updated = await service.updateListingStatus(
      org.id,
      "u1",
      listing.id,
      { status: "PUBLISHED" } as any,
    );
    expect(updated.status).toBe("PUBLISHED");
    expect(updated.publishedAt).toBeInstanceOf(Date);
    expect(listings.get(listing.id)?.submittedAt).toBeInstanceOf(Date);
  });

  it("rejects installing an unpublished listing", async () => {
    const { service } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D",
      description: "View",
    } as any);
    await expect(
      service.installPlugin(org, { listingId: listing.id } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("enforces max installs policy", async () => {
    const { service, prisma, listings, getPolicy } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D",
      description: "View",
    } as any);
    listings.set(listing.id, { ...listing, status: "PUBLISHED" });
    // Pre-populate policy with maxInstalls=0 so installs are rejected
    prisma.pluginPolicy.findUnique.mockResolvedValue({
      id: "policy-1",
      organizationId: org.id,
      maxInstalls: 0,
      allowedCategories: [],
      requireApproval: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.pluginPolicy.update.mockImplementation(async (args: any) => {
      const existing = (await prisma.pluginPolicy.findUnique({
        where: { organizationId: org.id },
      })) as any;
      return { ...existing, ...args.data };
    });
    expect(getPolicy()).toBeNull();
    await expect(
      service.installPlugin(org, { listingId: listing.id } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("installs a published listing when within policy", async () => {
    const { service, listings } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D",
      description: "View",
      categories: ["visualization"],
    } as any);
    listings.set(listing.id, { ...listing, status: "PUBLISHED" });
    const installation = await service.installPlugin(org, {
      listingId: listing.id,
    } as any);
    expect(installation.status).toBe("ACTIVE");
  });

  it("rejects duplicate installations", async () => {
    const { service, listings } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D",
      description: "View",
    } as any);
    listings.set(listing.id, { ...listing, status: "PUBLISHED" });
    await service.installPlugin(org, { listingId: listing.id } as any);
    await expect(
      service.installPlugin(org, { listingId: listing.id } as any),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("creates and moderates a review", async () => {
    const { service, listings } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D",
      description: "View",
    } as any);
    const review = await service.createReview(org, "u2", {
      listingId: listing.id,
      rating: 5,
      comment: "Excellent",
    } as any);
    const updated = await service.updateReviewStatus(org.id, review.id, {
      status: "APPROVED",
    } as any);
    expect(updated.status).toBe("APPROVED");
  });

  it("throws when reviewing an unknown listing", async () => {
    const { service } = setup();
    await expect(
      service.createReview(org, "u1", {
        listingId: "missing",
        rating: 4,
      } as any),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it("uninstalls a plugin installation", async () => {
    const { service, listings } = setup();
    const listing = await service.createListing(org, "u1", {
      pluginId: "plugin.3d_viewer",
      name: "3D",
      description: "View",
    } as any);
    listings.set(listing.id, { ...listing, status: "PUBLISHED" });
    const installation = await service.installPlugin(org, {
      listingId: listing.id,
    } as any);
    const result = await service.uninstallPlugin(org.id, installation.id);
    expect(result.deleted).toBe(true);
  });

  it("creates a default policy on first read", async () => {
    const { service } = setup();
    const policy = await service.getPolicy(org.id);
    expect(policy.maxInstalls).toBe(50);
  });

  it("updates existing policy", async () => {
    const { service } = setup();
    await service.getPolicy(org.id);
    const updated = await service.updatePolicy(org.id, {
      maxInstalls: 25,
      requireApproval: true,
    } as any);
    expect(updated.maxInstalls).toBe(25);
    expect(updated.requireApproval).toBe(true);
  });
});
