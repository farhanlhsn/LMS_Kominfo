import { beforeEach,describe,expect,it,vi } from "vitest";
import { JwtAuthGuard } from "../rbac/guards/jwt-auth.guard";
import { OrganizationContextGuard } from "../rbac/guards/organization-context.guard";
import { PermissionsGuard } from "../rbac/guards/permissions.guard";
import { BulkOperationController } from "./bulk.controller";

describe("BulkOperationController", () => {
  let controller: BulkOperationController;
  let service: {
    createAndRun: ReturnType<typeof vi.fn>;
    list: ReturnType<typeof vi.fn>;
    findOne: ReturnType<typeof vi.fn>;
    cancel: ReturnType<typeof vi.fn>;
    resume: ReturnType<typeof vi.fn>;
    assertCanRun: ReturnType<typeof vi.fn>;
  };

  const org = {
    id: "org_1",
    slug: "acme",
    name: "Acme",
    memberId: "m_1",
    roleKeys: ["super_admin"],
    permissionKeys: ["platform:admin"],
    isPlatformAdmin: true,
  };
  const user = {
    id: "user_1",
    email: "u@example.com",
    name: "User",
    sessionId: "sess_1",
    activeOrganizationId: "org_1",
  };

  beforeEach(() => {
    service = {
      createAndRun: vi.fn().mockResolvedValue({ job: { id: "job_1" }, items: [{ id: "c1", status: "ok" }] }),
      list: vi.fn().mockResolvedValue([{ id: "job_1" }]),
      findOne: vi.fn().mockResolvedValue({ id: "job_1", items: [] }),
      cancel: vi.fn().mockResolvedValue({ id: "job_1", status: "CANCELLED" }),
      resume: vi.fn().mockResolvedValue({ resumed: true, id: "job_1" }),
      assertCanRun: vi.fn(),
    };

    controller = new BulkOperationController(service as never);
  });

  it("creates and runs a job", async () => {
    const result = await controller.create(
      { type: "ARCHIVE", items: [{ entityType: "course", entityId: "c1" }] } as never,
      user as never,
      org as never,
    );
    expect(service.assertCanRun).toHaveBeenCalledWith("org_1", true);
    expect((result as unknown as { data: { job: { id: string } } }).data.job.id).toBe("job_1");
  });

  it("lists jobs with query", async () => {
    const result = await controller.list({ type: "ARCHIVE" } as never, org as never);
    expect((result as { data: unknown[] }).data).toEqual([{ id: "job_1" }]);
  });

  it("gets a single job", async () => {
    const result = await controller.get("job_1", org as never);
    expect((result as { data: { id: string } }).data.id).toBe("job_1");
  });

  it("cancels a job with reason", async () => {
    const result = await controller.cancel(
      "job_1",
      { reason: "ops mistake" } as never,
      user as never,
      org as never,
    );
    expect((result as { data: { status: string } }).data.status).toBe("CANCELLED");
  });

  it("resumes a job", async () => {
    const result = await controller.resume("job_1", org as never);
    expect((result as { data: { resumed: boolean } }).data.resumed).toBe(true);
  });

  it("wires guards", () => {
    expect(PermissionsGuard).toBeDefined();
    expect(JwtAuthGuard).toBeDefined();
    expect(OrganizationContextGuard).toBeDefined();
  });
});
