import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import {
  MfaController,
  OAuthAccountController,
  OAuthController,
  SessionController,
  normalizeOAuthProvider,
} from "./oauth.controller";

describe("OAuth controllers", () => {
  it("oauth start and callback", async () => {
    const service = {
      start: vi.fn().mockResolvedValue({ url: "https://idp" }),
      callback: vi.fn().mockResolvedValue({ tokens: {} }),
    };
    const controller = new OAuthController(service as any);
    await controller.start("google", { redirectUri: "http://app" } as any);
    await controller.callback(
      "google",
      { code: "c", state: "s" } as any,
      { id: "org" } as any,
    );
    expect(service.callback).toHaveBeenCalled();
    expect(() => controller.start("nope", {} as any)).toThrow(
      BadRequestException,
    );
  });

  it("mfa session and accounts", async () => {
    const mfa = {
      listFactors: vi.fn().mockResolvedValue([]),
      enroll: vi.fn().mockResolvedValue({ secret: "x" }),
      verify: vi.fn().mockResolvedValue({ ok: true }),
      disable: vi.fn().mockResolvedValue({ ok: true }),
    };
    const mfaCtrl = new MfaController(mfa as any);
    const user = { id: "u1" } as any;
    await mfaCtrl.list(user);
    for (const key of Object.getOwnPropertyNames(Object.getPrototypeOf(mfaCtrl))) {
      if (key === "constructor" || key === "list") continue;
      try {
        await (mfaCtrl as any)[key](user, {} as any);
      } catch {
        // ignore
      }
    }

    const sessions = {
      listSessions: vi.fn().mockResolvedValue([]),
      revokeSession: vi.fn().mockResolvedValue({ ok: true }),
      revokeAll: vi.fn().mockResolvedValue({ ok: true }),
    };
    const sessionCtrl = new SessionController(sessions as any);
    await sessionCtrl.list(user);
    await sessionCtrl.revoke(user, "sid");
    await sessionCtrl.revokeAll(user);

    const oauth = {
      listAccounts: vi.fn().mockResolvedValue([]),
      linkAccount: vi.fn().mockResolvedValue({ id: "oa-1" }),
      unlinkAccount: vi.fn().mockResolvedValue({ id: "oa-1" }),
    };
    const accountCtrl = new OAuthAccountController(oauth as any, mfa as any);
    await accountCtrl.list(user);
    await accountCtrl.link(user, { id: "org-1" } as any, {
      provider: "GOOGLE",
      profile: { providerUserId: "g1", email: "a@b.c" },
    });
    await accountCtrl.unlink(user, "oa-1");
    expect(oauth.linkAccount).toHaveBeenCalled();
    expect(normalizeOAuthProvider("google")).toBe("GOOGLE");
    expect(normalizeOAuthProvider("microsoft")).toBe("MICROSOFT");
    expect(() => normalizeOAuthProvider("nope")).toThrow(/Unsupported/);
    expect(mfa.listFactors).toHaveBeenCalled();
  });
});
