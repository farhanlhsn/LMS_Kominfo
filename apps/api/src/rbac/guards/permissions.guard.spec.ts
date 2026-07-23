import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PermissionsGuard } from "./permissions.guard";

function createContext(request: any, _reflector: any) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as any;
}

function createReflector(permissions: string[] | undefined) {
  return {
    getAllAndOverride: (key: string) =>
      key === "required_permissions" ? permissions : undefined,
  } as any;
}

function createRbac(allowed: boolean) {
  return {
    hasPermissions: vi.fn().mockReturnValue(allowed),
    hasPermissionsAtContext: vi.fn().mockResolvedValue(allowed),
  } as any;
}

describe("PermissionsGuard", () => {
  it("rejects when organization context is missing", async () => {
    const guard = new PermissionsGuard(createReflector(["x"]), createRbac(true));
    await expect(
      guard.canActivate(
        createContext({ organization: undefined, user: { id: "u" } }, null),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies when no permissions metadata is set", async () => {
    const guard = new PermissionsGuard(createReflector(undefined), createRbac(true));
    const request = { organization: { id: "o" }, user: { id: "u" } };
    await expect(
      guard.canActivate(createContext(request, null)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("denies when permissions list is empty", async () => {
    const guard = new PermissionsGuard(createReflector([]), createRbac(true));
    const request = { organization: { id: "o" }, user: { id: "u" } };
    await expect(
      guard.canActivate(createContext(request, null)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("rejects when rbac says no", async () => {
    const guard = new PermissionsGuard(createReflector(["x"]), createRbac(false));
    const request = { organization: { id: "o" }, user: { id: "u" } };
    await expect(
      guard.canActivate(createContext(request, null)),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it("allows when rbac says yes", async () => {
    const guard = new PermissionsGuard(createReflector(["x"]), createRbac(true));
    const request = {
      organization: { id: "o" },
      user: { id: "u", sessionId: "s" },
    };
    await expect(
      guard.canActivate(createContext(request, null)),
    ).resolves.toBe(true);
  });

  it("infers course context from route parameters", async () => {
    const rbac = createRbac(true);
    const guard = new PermissionsGuard(createReflector(["courses:update"]), rbac);
    const request = {
      organization: { id: "o" },
      user: { id: "u", sessionId: "s" },
      params: { courseId: "course-1" },
    };

    await guard.canActivate(createContext(request, null));

    expect(rbac.hasPermissionsAtContext).toHaveBeenCalledWith(
      expect.objectContaining({
        context: { type: "COURSE", instanceId: "course-1" },
      }),
    );
  });
});
