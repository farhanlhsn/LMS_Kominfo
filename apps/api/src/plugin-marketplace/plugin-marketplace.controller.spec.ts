import { describe, expect, it, vi } from "vitest";
import {
  PluginInstallationController,
  PluginListingController,
  PluginPolicyController,
  PluginReviewController,
} from "./plugin-marketplace.controller";

const org = { id: "org-a" } as any;
const user = { id: "u-1" } as any;

function service() {
  return {
    listListings: vi.fn().mockResolvedValue([]),
    createListing: vi.fn().mockResolvedValue({ id: "l1" }),
    getListing: vi.fn().mockResolvedValue({ id: "l1" }),
    updateListing: vi.fn().mockResolvedValue({ id: "l1" }),
    updateListingStatus: vi.fn().mockResolvedValue({ id: "l1" }),
    listReviews: vi.fn().mockResolvedValue([]),
    createReview: vi.fn().mockResolvedValue({ id: "r1" }),
    updateReviewStatus: vi.fn().mockResolvedValue({ id: "r1" }),
    listInstallations: vi.fn().mockResolvedValue([]),
    installPlugin: vi.fn().mockResolvedValue({ id: "i1" }),
    updateInstallationStatus: vi.fn().mockResolvedValue({ id: "i1" }),
    uninstallPlugin: vi.fn().mockResolvedValue({ deleted: true }),
    getPolicy: vi.fn().mockResolvedValue({ maxInstalls: 50 }),
    updatePolicy: vi.fn().mockResolvedValue({ maxInstalls: 25 }),
  };
}

describe("Plugin marketplace controllers", () => {
  it("delegates listing endpoints", async () => {
    const svc = service();
    const c = new PluginListingController(svc as any);
    await c.list(org, "DRAFT");
    await c.create(org, user, { pluginId: "p1", name: "P" } as any);
    await c.get(org, "l1");
    await c.update(org, "l1", { name: "P2" } as any);
    await c.updateStatus(org, user, "l1", { status: "PUBLISHED" } as any);
    expect(svc.updateListingStatus).toHaveBeenCalled();
  });

  it("delegates review installation and policy endpoints", async () => {
    const svc = service();
    const reviews = new PluginReviewController(svc as any);
    await reviews.list(org, "l1");
    await reviews.create(org, user, { listingId: "l1", rating: 5 } as any);
    await reviews.updateStatus(org, "r1", { status: "APPROVED" } as any);

    const installs = new PluginInstallationController(svc as any);
    await installs.list(org);
    await installs.install(org, user, { listingId: "l1" } as any);
    await installs.updateStatus(org, user, "i1", { status: "ACTIVE" } as any);
    await installs.uninstall(org, user, "i1");

    const policy = new PluginPolicyController(svc as any);
    await policy.get(org);
    await policy.update(org, { maxInstalls: 25 } as any);
    expect(svc.uninstallPlugin).toHaveBeenCalledWith("org-a", user, "i1");
    expect(svc.updatePolicy).toHaveBeenCalled();
  });
});
