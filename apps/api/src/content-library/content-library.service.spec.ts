import { describe, expect, it, vi } from "vitest";
import { ContentLibraryService } from "./content-library.service";

const org = { id: "org-a", slug: "a", name: "A", memberId: "m1", roleKeys: ["instructor"], permissionKeys: [], isPlatformAdmin: false };

function setup() {
  const prisma = {
    contentLibraryItem: {
      findMany: vi.fn().mockResolvedValue([{ id: "item-1", title: "Doc" }]),
      create: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "item-2", ...data, file: null })),
      findFirst: vi.fn().mockResolvedValue({ id: "item-1", organizationId: "org-a" }),
      update: vi.fn().mockImplementation(({ data }: any) => Promise.resolve({ id: "item-1", ...data, file: null })),
    },
  } as any;
  const fileAccessPolicy = { ensureCanReadFile: vi.fn().mockResolvedValue(undefined) } as any;
  const contentProcessing = { enqueue: vi.fn().mockResolvedValue(undefined) } as any;
  return { service: new ContentLibraryService(prisma, fileAccessPolicy, contentProcessing), prisma, fileAccessPolicy, contentProcessing };
}

describe("ContentLibraryService", () => {
  it("lists items scoped to organization", async () => {
    const { service, prisma } = setup();
    const items = await service.list("org-a", { type: "DOC" });
    expect(items).toHaveLength(1);
    expect(prisma.contentLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ organizationId: "org-a", type: "DOC" }) })
    );
  });

  it("adds OR clause for search query", async () => {
    const { service, prisma } = setup();
    await service.list("org-a", { search: "guide" });
    expect(prisma.contentLibraryItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ OR: expect.any(Array) }) })
    );
  });

  it("creates item and triggers content processing events", async () => {
    const { service, prisma, fileAccessPolicy, contentProcessing } = setup();
    const result = await service.create(org, "u1", { title: "New", type: "DOC" } as any);
    expect(result.title).toBe("New");
    expect(prisma.contentLibraryItem.create).toHaveBeenCalled();
    expect(fileAccessPolicy.ensureCanReadFile).not.toHaveBeenCalled();
    expect(contentProcessing.enqueue).toHaveBeenCalledWith("CONTENT_CREATED", expect.objectContaining({ organizationId: "org-a", itemId: "item-2" }));
  });

  it("verifies file access when fileId is provided", async () => {
    const { service, fileAccessPolicy, contentProcessing } = setup();
    await service.create(org, "u1", { title: "New", type: "DOC", fileId: "file-1" } as any);
    expect(fileAccessPolicy.ensureCanReadFile).toHaveBeenCalledWith(org, "u1", "file-1");
    expect(contentProcessing.enqueue).toHaveBeenCalledWith("AI_INDEXING_REQUESTED", expect.objectContaining({ fileId: "file-1" }));
  });
});
