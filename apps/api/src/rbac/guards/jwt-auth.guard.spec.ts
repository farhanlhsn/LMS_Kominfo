import { UnauthorizedException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { JwtAuthGuard } from "./jwt-auth.guard";

function createContext(headers: Record<string, string | undefined> = {}) {
  const request: any = { headers };
  return {
    request,
    context: {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as any,
  };
}

describe("JwtAuthGuard", () => {
  it("rejects missing bearer token", async () => {
    const guard = new JwtAuthGuard(
      { verifyAsync: vi.fn() } as any,
      { userSession: { findUnique: vi.fn() } } as any,
    );
    const { context } = createContext({});
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it("rejects non-bearer authorization", async () => {
    const guard = new JwtAuthGuard(
      { verifyAsync: vi.fn() } as any,
      { userSession: { findUnique: vi.fn() } } as any,
    );
    const { context } = createContext({ authorization: "Basic abc" });
    await expect(guard.canActivate(context)).rejects.toThrow(
      /Missing bearer token|Invalid/,
    );
  });

  it("rejects invalid JWT", async () => {
    const guard = new JwtAuthGuard(
      {
        verifyAsync: vi.fn().mockRejectedValue(new Error("bad")),
      } as any,
      { userSession: { findUnique: vi.fn() } } as any,
    );
    const { context } = createContext({ authorization: "Bearer tok" });
    await expect(guard.canActivate(context)).rejects.toThrow(
      /Invalid access token/,
    );
  });

  it("rejects non-access token type", async () => {
    const guard = new JwtAuthGuard(
      {
        verifyAsync: vi.fn().mockResolvedValue({
          type: "refresh",
          sub: "u1",
          sessionId: "s1",
        }),
      } as any,
      { userSession: { findUnique: vi.fn() } } as any,
    );
    const { context } = createContext({ authorization: "Bearer tok" });
    await expect(guard.canActivate(context)).rejects.toThrow(
      /Invalid token type/,
    );
  });

  it("rejects inactive or missing session", async () => {
    const findUnique = vi.fn().mockResolvedValue(null);
    const guard = new JwtAuthGuard(
      {
        verifyAsync: vi.fn().mockResolvedValue({
          type: "access",
          sub: "u1",
          sessionId: "s1",
          activeOrganizationId: "org-1",
        }),
      } as any,
      { userSession: { findUnique } } as any,
    );
    const { context } = createContext({ authorization: "Bearer tok" });
    await expect(guard.canActivate(context)).rejects.toThrow(
      /Session is not active/,
    );
  });

  it("rejects revoked or expired session or inactive user", async () => {
    const base = {
      id: "s1",
      userId: "u1",
      revokedAt: null as Date | null,
      expiresAt: new Date(Date.now() + 60_000),
      activeOrganizationId: "org-1",
      user: { id: "u1", email: "a@b.c", name: "A", status: "ACTIVE" },
    };
    const cases = [
      { ...base, userId: "other" },
      { ...base, revokedAt: new Date() },
      { ...base, expiresAt: new Date(Date.now() - 1000) },
      {
        ...base,
        user: { ...base.user, status: "SUSPENDED" },
      },
    ];
    for (const session of cases) {
      const guard = new JwtAuthGuard(
        {
          verifyAsync: vi.fn().mockResolvedValue({
            type: "access",
            sub: "u1",
            sessionId: "s1",
          }),
        } as any,
        { userSession: { findUnique: vi.fn().mockResolvedValue(session) } } as any,
      );
      const { context } = createContext({ authorization: "Bearer tok" });
      await expect(guard.canActivate(context)).rejects.toThrow(
        /Session is not active/,
      );
    }
  });

  it("attaches user on valid access token", async () => {
    const session = {
      id: "s1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      activeOrganizationId: "org-session",
      user: { id: "u1", email: "a@b.c", name: "A", status: "ACTIVE" },
    };
    const guard = new JwtAuthGuard(
      {
        verifyAsync: vi.fn().mockResolvedValue({
          type: "access",
          sub: "u1",
          sessionId: "s1",
          activeOrganizationId: "org-payload",
        }),
      } as any,
      { userSession: { findUnique: vi.fn().mockResolvedValue(session) } } as any,
    );
    const { context, request } = createContext({
      authorization: "Bearer good-token",
    });
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({
      id: "u1",
      email: "a@b.c",
      name: "A",
      sessionId: "s1",
      activeOrganizationId: "org-payload",
    });
  });

  it("falls back to session activeOrganizationId", async () => {
    const session = {
      id: "s1",
      userId: "u1",
      revokedAt: null,
      expiresAt: new Date(Date.now() + 60_000),
      activeOrganizationId: "org-session",
      user: { id: "u1", email: "a@b.c", name: null, status: "ACTIVE" },
    };
    const guard = new JwtAuthGuard(
      {
        verifyAsync: vi.fn().mockResolvedValue({
          type: "access",
          sub: "u1",
          sessionId: "s1",
          activeOrganizationId: null,
        }),
      } as any,
      { userSession: { findUnique: vi.fn().mockResolvedValue(session) } } as any,
    );
    const { context, request } = createContext({
      authorization: "Bearer good-token",
    });
    await guard.canActivate(context);
    expect(request.user.activeOrganizationId).toBe("org-session");
  });
});
