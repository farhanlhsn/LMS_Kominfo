import { describe, expect, it, vi } from "vitest";
import {
  AdminSearchController,
  SearchController,
} from "./search.controller";

describe("Search controllers", () => {
  it("global search delegates", async () => {
    const service = {
      search: vi.fn().mockResolvedValue({ results: [] }),
    };
    const controller = new SearchController(service as any);
    await controller.global(
      { id: "org-1" } as any,
      { id: "u1" } as any,
      { q: "tcp", limit: 10 } as any,
    );
    expect(service.search).toHaveBeenCalled();
  });

  it("admin analytics delegates", async () => {
    const service = {
      getAnalytics: vi.fn().mockResolvedValue({ top: [] }),
    };
    const admin = new AdminSearchController(service as any);
    await admin.analytics({ id: "org-1" } as any, {
      days: 7,
      limit: 5,
    } as any);
    expect(service.getAnalytics).toHaveBeenCalledWith("org-1", 7, 5);
  });
});
