import { ForbiddenException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { PermissionsGuard } from "./permissions.guard";

function createContext(request: any, reflector: any) {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as any;
}

function createReflector(permissions: string[] | undefined) {
  return {
    getAllAndOverride: () => permissions,
  } as any;
}

function createRbac(allowed: boolean) {
  return { hasPermissions: () => allowed } as any;
}

describe("PermissionsGuard", () => {
  it("rejects when organization context is missing", () => {
    const guard = new PermissionsGuard(createReflector(["x"]), createRbac(true));
    expect(() =>
      guard.canActivate(createContext({ organization: undefined }, null))
    ).toThrow(ForbiddenException);
  });

  it("allows when no permissions are required", () => {
    const guard = new PermissionsGuard(createReflector([]), createRbac(true));
    const request = { organization: { id: "o" } };
    expect(guard.canActivate(createContext(request, null))).toBe(true);
  });

  it("rejects when rbac says no", () => {
    const guard = new PermissionsGuard(createReflector(["x"]), createRbac(false));
    const request = { organization: { id: "o" } };
    expect(() => guard.canActivate(createContext(request, null))).toThrow(ForbiddenException);
  });

  it("allows when rbac says yes", () => {
    const guard = new PermissionsGuard(createReflector(["x"]), createRbac(true));
    const request = { organization: { id: "o" } };
    expect(guard.canActivate(createContext(request, null))).toBe(true);
  });
});
