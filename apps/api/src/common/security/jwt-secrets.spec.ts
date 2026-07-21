import { afterEach, describe, expect, it } from "vitest";
import {
  assertJwtSecretsConfigured,
  jwtAccessSecret,
  jwtRefreshSecret,
} from "./jwt-secrets";

const original = {
  NODE_ENV: process.env.NODE_ENV,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
};

afterEach(() => {
  process.env.NODE_ENV = original.NODE_ENV;
  if (original.JWT_ACCESS_SECRET === undefined) {
    delete process.env.JWT_ACCESS_SECRET;
  } else {
    process.env.JWT_ACCESS_SECRET = original.JWT_ACCESS_SECRET;
  }
  if (original.JWT_REFRESH_SECRET === undefined) {
    delete process.env.JWT_REFRESH_SECRET;
  } else {
    process.env.JWT_REFRESH_SECRET = original.JWT_REFRESH_SECRET;
  }
});

describe("jwt-secrets", () => {
  it("allows dev defaults outside production", () => {
    process.env.NODE_ENV = "development";
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(jwtAccessSecret()).toBe("dev-access-secret");
    expect(jwtRefreshSecret()).toBe("dev-refresh-secret");
    expect(() => assertJwtSecretsConfigured()).not.toThrow();
  });

  it("fails production boot without secrets", () => {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_REFRESH_SECRET;
    expect(() => jwtAccessSecret()).toThrow(/JWT_ACCESS_SECRET/);
    expect(() => jwtRefreshSecret()).toThrow(/JWT_REFRESH_SECRET/);
    expect(() => assertJwtSecretsConfigured()).toThrow(/JWT_ACCESS_SECRET/);
  });


  it("accepts production when both secrets are set", () => {
    process.env.NODE_ENV = "production";
    process.env.JWT_ACCESS_SECRET = "prod-access";
    process.env.JWT_REFRESH_SECRET = "prod-refresh";
    expect(jwtAccessSecret()).toBe("prod-access");
    expect(jwtRefreshSecret()).toBe("prod-refresh");
    expect(() => assertJwtSecretsConfigured()).not.toThrow();
  });
});
