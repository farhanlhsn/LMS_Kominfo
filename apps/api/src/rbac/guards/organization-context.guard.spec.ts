import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { describe, expect, it } from "vitest";
import { OrganizationContextGuard } from "./organization-context.guard";
import type { AuthenticatedRequest } from "../../auth/types/authenticated-request";

function createContext(request: Partial<AuthenticatedRequest>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request as AuthenticatedRequest,
    }),
  } as any;
}

function createRbacStub(organization: unknown) {
  return {
    getOrganizationContext: async () => organization,
  } as any;
}

describe("OrganizationContextGuard", () => {
  it("rejects when user is missing", async () => {
    const guard = new OrganizationContextGuard(createRbacStub({}));
    await expect(
      guard.canActivate(createContext({ headers: {} }))
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("rejects when no organization id is provided", async () => {
    const guard = new OrganizationContextGuard(createRbacStub({}));
    const request = { user: { id: "u1" }, headers: {}, params: {} } as any;
    await expect(guard.canActivate(createContext(request))).rejects.toBeInstanceOf(
      UnauthorizedException
    );
  });

  it("uses header organization id when available", async () => {
    const org = { id: "org-1" };
    const guard = new OrganizationContextGuard(createRbacStub(org));
    const request = {
      user: { id: "u1", activeOrganizationId: "fallback" },
      headers: { "x-organization-id": "org-1" },
      params: {},
    } as any;
    const result = await guard.canActivate(createContext(request));
    expect(result).toBe(true);
    expect((request as AuthenticatedRequest).organization).toEqual(org);
  });

  it("falls back to activeOrganizationId when header and param are missing", async () => {
    const guard = new OrganizationContextGuard(createRbacStub({ id: "active" }));
    const request = {
      user: { id: "u1", activeOrganizationId: "active" },
      headers: {},
      params: {},
    } as any;
    await expect(guard.canActivate(createContext(request))).resolves.toBe(true);
  });
});
